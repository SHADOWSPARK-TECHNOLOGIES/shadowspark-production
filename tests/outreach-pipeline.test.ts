/**
 * Outreach Pipeline & Commercial Telemetry Integration Tests — ShadowSpark
 * 
 * Verifies:
 * 1. Batch 01 Prospect Seeding idempotency and channel metadata structure
 * 2. Multi-channel dispatch URL generation, email dispatch, and operator logging
 * 3. WhatsApp webhook delivery telemetry persistence (delivered, read, failed)
 * 4. Institutional SEC Circular 26-1 nurture copy integrity (zero consumer $10 copy)
 * 5. Customer evidence ledger synchronization with zero fake metrics
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

// Mock @/lib/prisma globally for test isolation
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      lead: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      emailEvent: {
        create: vi.fn(),
        count: vi.fn(),
      },
      demo: {
        count: vi.fn(),
      },
      tenant: {
        count: vi.fn(),
      },
      payment: {
        aggregate: vi.fn(),
      },
      systemEvent: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/whatsapp/send-payment-link", () => ({ sendTextWhatsApp: vi.fn() }));
vi.mock("@/lib/ai/whatsapp-bot", () => ({ getBotReply: vi.fn() }));

import { prisma } from "@/lib/prisma";
import {
  seedBatch01Prospects,
  BATCH_01_PROSPECTS,
} from "../scripts/seed-batch01-prospects";
import {
  generateMailtoUrl,
  generateWhatsAppUrl,
  dispatchOutreachEmail,
  logManualDispatch,
  PROSPECTS,
} from "../scripts/dispatch-outreach";
import {
  syncCustomerEvidence,
  fetchEvidenceTelemetry,
  generateCustomerEvidenceMarkdown,
  generateFirst5CustomersMarkdown,
} from "../scripts/sync-customer-evidence";

describe("Requirement R1: Outreach Seeding & Batch 01 Targets", () => {
  it("contains all 10 qualified Nigerian financial institutions", () => {
    expect(BATCH_01_PROSPECTS).toHaveLength(10);

    const requiredEmails = [
      "compliance@fairmoney.io",
      "compliance@getcarbon.co",
      "compliance@renmoney.com",
      "nigeria-compliance@branch.co",
      "compliance@kuda.com",
      "compliance@palmpay-inc.com",
      "compliance@quidax.com",
      "compliance@busha.co",
      "compliance@yellowcard.io",
      "compliance@flitaa.com",
    ];

    const actualEmails = BATCH_01_PROSPECTS.map((p) => p.email);
    for (const email of requiredEmails) {
      expect(actualEmails).toContain(email);
    }
  });

  it("idempotently seeds all 10 institutions into database", async () => {
    const store = new Map<string, any>();

    const mockClient = {
      lead: {
        findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
          return store.get(where.email) || null;
        }),
        upsert: vi.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: { email: string };
            create: any;
            update: any;
          }) => {
            const existing = store.get(where.email);
            if (existing) {
              const updated = {
                ...existing,
                ...update,
                id: existing.id,
                email: existing.email,
              };
              store.set(where.email, updated);
              return updated;
            }
            const created = {
              ...create,
              id: `lead-${store.size + 1}`,
              email: where.email,
            };
            store.set(where.email, created);
            return created;
          }
        ),
      },
    };

    // First seed run
    const res1 = await seedBatch01Prospects(mockClient);
    expect(res1.total).toBe(10);
    expect(res1.upserted).toBe(10);
    expect(store.size).toBe(10);

    // Verify channel structures in metadata
    const fairmoney = store.get("compliance@fairmoney.io");
    expect(fairmoney).toBeDefined();
    expect(fairmoney.metadata.channels.email.address).toBe("compliance@fairmoney.io");
    expect(fairmoney.metadata.channels.email.status).toBe("pending");
    expect(fairmoney.metadata.channels.linkedin.profileUrl).toContain("fairmoney");
    expect(fairmoney.metadata.channels.whatsapp.status).toBe("pending");
    expect(fairmoney.metadata.pilotTerms.durationDays).toBe(14);
    expect(fairmoney.tier).toBe("enterprise");

    // Second run must be idempotent (no duplicates, preserves state)
    const res2 = await seedBatch01Prospects(mockClient);
    expect(res2.upserted).toBe(10);
    expect(store.size).toBe(10);
  });
});

describe("Requirement R1: Dispatch Engine & Multi-Channel Tools", () => {
  it("generates valid mailto deep links for all prospects", () => {
    for (const p of PROSPECTS) {
      const url = generateMailtoUrl(p);
      expect(url).toMatch(/^mailto:/);
      expect(url).toContain(encodeURIComponent(p.contactEmail).replace(/%40/g, "@"));
      expect(url).toContain("subject=");
      expect(url).toContain("body=");
    }
  });

  it("generates valid WhatsApp Web deep links with encoded body", () => {
    for (const p of PROSPECTS) {
      const url = generateWhatsAppUrl(p);
      expect(url).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?text=/);
      expect(url).toContain(encodeURIComponent(p.subject));
    }
  });

  it("dispatches live or simulated outreach email and updates channel status to sent", async () => {
    const leadRecord = {
      id: "lead-fairmoney-1",
      email: "compliance@fairmoney.io",
      status: "QUALIFIED",
      metadata: {
        channels: {
          email: { address: "compliance@fairmoney.io", status: "pending" },
          linkedin: { status: "pending" },
          whatsapp: { status: "pending" },
        },
      },
    };

    let updatedLeadData: any = null;
    let createdEmailEvent: any = null;

    // Set up mock prisma
    (prisma.lead.findUnique as any).mockResolvedValue(leadRecord);
    (prisma.lead.update as any).mockImplementation(async ({ data }: any) => {
      updatedLeadData = data;
      return { ...leadRecord, ...data };
    });
    (prisma.emailEvent.create as any).mockImplementation(async ({ data }: any) => {
      createdEmailEvent = data;
      return { id: "evt-1", ...data };
    });

    const res = await dispatchOutreachEmail({
      leadId: leadRecord.id,
      email: leadRecord.email,
      subject: "Test Subject",
      body: "Test Body",
      client: prisma,
    });

    expect(res.success).toBe(true);
    expect(res.leadId).toBe(leadRecord.id);
    expect(updatedLeadData).toBeDefined();
    expect(updatedLeadData.metadata.channels.email.status).toBe("sent");
    expect(updatedLeadData.metadata.channels.email.lastDispatchedAt).toBeDefined();
    expect(createdEmailEvent).toBeDefined();
    expect(createdEmailEvent.type).toBe("sent");
  });

  it("manually logs operator dispatch for LinkedIn and WhatsApp", async () => {
    const leadRecord = {
      id: "lead-carbon-2",
      email: "compliance@getcarbon.co",
      status: "QUALIFIED",
      metadata: {
        channels: {
          linkedin: { status: "pending" },
          whatsapp: { status: "pending" },
        },
      },
    };

    let updatedData: any = null;
    let systemEventLogged: any = null;

    const mockClient = {
      lead: {
        findUnique: vi.fn(async () => leadRecord),
        update: vi.fn(async ({ data }: any) => {
          updatedData = data;
          return { ...leadRecord, ...data };
        }),
      },
      systemEvent: {
        create: vi.fn(async ({ data }: any) => {
          systemEventLogged = data;
          return { id: "sys-1", ...data };
        }),
      },
    };

    const res = await logManualDispatch({
      leadId: leadRecord.id,
      channel: "linkedin",
      status: "sent",
      notes: "Connected with Head of Risk via InMail",
      client: mockClient,
    });

    expect(res.success).toBe(true);
    expect(res.channel).toBe("linkedin");
    expect(res.status).toBe("sent");
    expect(updatedData.metadata.channels.linkedin.status).toBe("sent");
    expect(updatedData.metadata.channels.linkedin.notes).toBe(
      "Connected with Head of Risk via InMail"
    );
    expect(systemEventLogged).toBeDefined();
    expect(systemEventLogged.type).toBe("OUTREACH_LOGGED");
  });
});

describe("Requirement R1: WhatsApp Webhook Telemetry", () => {
  it("persists delivered and read status updates into Lead metadata", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/meta/route");

    const targetLead = {
      id: "lead-palmpay-6",
      phoneNumber: "2348012345678",
      email: "compliance@palmpay-inc.com",
      status: "QUALIFIED",
      metadata: {
        channels: {
          whatsapp: { status: "sent", deliveryStatus: null },
        },
      },
    };

    let leadUpdated: any = null;
    (prisma.lead.findFirst as any).mockResolvedValue(targetLead);
    (prisma.lead.update as any).mockImplementation(async ({ data }: any) => {
      leadUpdated = data;
      return { ...targetLead, ...data };
    });

    // Simulate WhatsApp Cloud API status update payload
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "wamid.HBgLMjM0ODAxMjM0NTY3OAIW",
                    status: "delivered",
                    timestamp: "1630000000",
                    recipient_id: "2348012345678",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const req = new NextRequest("https://example.test/api/webhooks/whatsapp/meta", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");

    expect(leadUpdated).toBeDefined();
    expect(leadUpdated.metadata.channels.whatsapp.deliveryStatus).toBe("delivered");
    expect(leadUpdated.metadata.channels.whatsapp.lastStatusTimestamp).toBe("1630000000");
  });

  it("handles failed delivery status and records error details", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/meta/route");

    const targetLead = {
      id: "lead-flitaa-10",
      phoneNumber: "2348098765432",
      email: "compliance@flitaa.com",
      metadata: {
        channels: {
          whatsapp: { status: "sent" },
        },
      },
    };

    let leadUpdated: any = null;
    (prisma.lead.findFirst as any).mockResolvedValue(targetLead);
    (prisma.lead.update as any).mockImplementation(async ({ data }: any) => {
      leadUpdated = data;
      return { ...targetLead, ...data };
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "wamid.FAIL123",
                    status: "failed",
                    timestamp: "1630000100",
                    recipient_id: "2348098765432",
                    errors: [{ code: 131026, title: "Message undeliverable" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const req = new NextRequest("https://example.test/api/webhooks/whatsapp/meta", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(leadUpdated).toBeDefined();
    expect(leadUpdated.metadata.channels.whatsapp.deliveryStatus).toBe("failed");
    expect(leadUpdated.metadata.channels.whatsapp.errors).toHaveLength(1);
    expect(leadUpdated.metadata.channels.whatsapp.errors[0].code).toBe(131026);
  });
});

describe("Requirement R1: Institutional Nurture & SEC Circular 26-1 Copy", () => {
  it("does not contain outdated consumer $10 audit or promo code copy in nurture.ts", () => {
    const nurtureFile = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "leads", "nurture.ts"),
      "utf-8"
    );

    expect(nurtureFile).not.toContain("$10");
    expect(nurtureFile).not.toContain("ACTIVATION20");
    expect(nurtureFile).not.toContain("How is your audit");
    expect(nurtureFile).not.toContain("Closing the Revenue Gap");

    // Must contain institutional SEC Circular 26-1 and CBN compliance positioning
    expect(nurtureFile).toContain("SEC Circular 26-1");
    expect(nurtureFile).toContain("CBN AML/CFT Directives");
    expect(nurtureFile).toContain("14-Day Guided Pilot Cohort Reservation");
  });

  it("does not contain consumer $10 audit references in follow-up-worker.ts", () => {
    const workerFile = fs.readFileSync(
      path.join(process.cwd(), "src", "workers", "follow-up-worker.ts"),
      "utf-8"
    );

    expect(workerFile).not.toContain("$10");
    expect(workerFile).not.toContain("plan=audit");
    expect(workerFile).not.toContain("refundable deposit");

    // Must contain institutional compliance positioning
    expect(workerFile).toContain("SEC Circular 26-1");
    expect(workerFile).toContain("The ShadowSpark Compliance Team");
  });
});

describe("Requirement R1: Customer Evidence Synchronization & Zero Fake Metrics", () => {
  it("keeps all metrics strictly at 0 or UNKNOWN when no commercial events exist", async () => {
    const emptyClient = {
      lead: { findMany: vi.fn().mockResolvedValue([]) },
      emailEvent: { count: vi.fn().mockResolvedValue(0) },
      demo: { count: vi.fn().mockResolvedValue(0) },
      tenant: { count: vi.fn().mockResolvedValue(0) },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };

    const { metrics, interactions, first5 } = await fetchEvidenceTelemetry(emptyClient);

    expect(metrics.prospectsContacted).toBe(0);
    expect(metrics.prospectsContactedDisplay).toBe("10 (Batch 01 Queued/Ready)");
    expect(metrics.demosBooked).toBe(0);
    expect(metrics.demosCompleted).toBe(0);
    expect(metrics.pilotsOffered).toBe(0);
    expect(metrics.pilotsStarted).toBe(0);
    expect(metrics.activeCustomers).toBe(0);
    expect(metrics.paymentsReceivedNgn).toBe("₦0.00");
    expect(interactions).toHaveLength(10);
    expect(first5).toHaveLength(5);
  });

  it("synchronizes evidence ledgers without fabricating fake numbers", async () => {
    // Simulate 2 dispatched prospects in DB
    const seededLeads = [
      {
        id: "lead-1",
        email: "compliance@fairmoney.io",
        metadata: {
          channels: {
            email: { status: "sent", lastDispatchedAt: "2026-09-17T12:00:00Z" },
          },
          pilotTerms: { status: "offered" },
        },
      },
      {
        id: "lead-2",
        email: "compliance@getcarbon.co",
        metadata: {
          channels: {
            linkedin: { status: "sent", lastDispatchedAt: "2026-09-17T12:30:00Z" },
          },
          pilotTerms: { status: "offered" },
        },
      },
    ];

    const mockClient = {
      lead: { findMany: vi.fn().mockResolvedValue(seededLeads) },
      emailEvent: { count: vi.fn().mockResolvedValue(1) },
      demo: { count: vi.fn().mockResolvedValue(0) },
      tenant: { count: vi.fn().mockResolvedValue(0) },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };

    const res = await syncCustomerEvidence({
      client: mockClient,
      writeFiles: false,
    });

    expect(res.success).toBe(true);
    expect(res.metrics.prospectsContacted).toBe(2);
    expect(res.metrics.prospectsContactedDisplay).toContain("2 (Dispatched via API/Console)");
    expect(res.metrics.demosBooked).toBe(0);
    expect(res.metrics.pilotsOffered).toBe(2);
    expect(res.metrics.pilotsStarted).toBe(0);
    expect(res.metrics.paymentsReceivedNgn).toBe("₦0.00");

    // Check generated markdown
    const md = generateCustomerEvidenceMarkdown(res.metrics, res.interactions);
    expect(md).toContain("2 (Dispatched via API/Console)");
    expect(md).toContain("Dispatched via Resend API");
    expect(md).toContain("Dispatched via LinkedIn InMail");
    expect(md).toContain("₦0.00");
  });
});
