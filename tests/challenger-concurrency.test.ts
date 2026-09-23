import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { UpstreamContractSimulator } from "./e2e/upstream-simulator";

// ─── Concurrent In-Memory Database Harness ──────────────────────────────────
class ConcurrentMockDatabase {
  tenants = new Map<string, any>();
  users = new Map<string, any>();
  memberships = new Map<string, any>();
  loans = new Map<string, any>();
  auditLogs = new Map<string, any>();
  leads = new Map<string, any>();
  emailEvents = new Map<string, any>();
  nextId = 1;

  reset() {
    this.tenants.clear();
    this.users.clear();
    this.memberships.clear();
    this.loans.clear();
    this.auditLogs.clear();
    this.leads.clear();
    this.emailEvents.clear();
    this.nextId = 1;
  }
}

const mockDb = new ConcurrentMockDatabase();

const { redisStore, redisLockStore } = vi.hoisted(() => ({
  redisStore: new Map<string, { value: string; expiry?: number }>(),
  redisLockStore: new Map<string, { owner: string; expiresAt: number }>(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(async (key: string) => {
      const item = redisStore.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        redisStore.delete(key);
        return null;
      }
      return item.value;
    }),
    set: vi.fn(async (key: string, value: string, _mode: string, ttl: number, condition: string) => {
      if (condition === "NX") {
        const existing = redisLockStore.get(key);
        if (existing && Date.now() <= existing.expiresAt) {
          return null;
        }
        redisLockStore.set(key, { owner: value, expiresAt: Date.now() + ttl * 1000 });
        return "OK";
      }
      redisStore.set(key, { value, expiry: Date.now() + ttl * 1000 });
      return "OK";
    }),
    setex: vi.fn(async (key: string, ttl: number, value: string) => {
      redisStore.set(key, { value, expiry: Date.now() + ttl * 1000 });
      return "OK";
    }),
    eval: vi.fn(async (_script: string, _numKeys: number, key: string, owner: string) => {
      const current = redisLockStore.get(key);
      if (current && current.owner === owner) {
        redisLockStore.delete(key);
        return 1;
      }
      return 0;
    }),
  },
}));

// ─── Prisma Hoisted Mock ───────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  tenant: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tenantMembership: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  loanApplication: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  lead: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  emailEvent: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const mockSignIn = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockRequireAuthContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/auth", () => ({ signIn: mockSignIn, auth: mockAuth }));
vi.mock("@/lib/api/auth-context", () => ({ requireAuthContext: mockRequireAuthContext }));
vi.mock("@/lib/cors", () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: () => new Response(null, { status: 204 }),
}));

import { provisionTrialTenantCore } from "@/app/actions/sandbox";
import { withIdempotency, generateIdempotencyKey } from "@/lib/idempotency";
import { dispatchOutreachEmail, logManualDispatch } from "../scripts/dispatch-outreach";
import { POST as whatsappWebhookPost, GET as whatsappWebhookGet } from "@/app/api/webhooks/whatsapp/meta/route";
import { NextRequest, NextResponse } from "next/server";

const TEST_API_URL = "https://ai-assist.production.internal";
const TEST_TOKEN = "ai-assist-server-token-super-secret";

describe("Empirical Challenger 1: Commercial & Concurrency Stress Harness", { timeout: 60000 }, () => {
  const simulator = new UpstreamContractSimulator(TEST_TOKEN, TEST_API_URL);

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.reset();
    redisStore.clear();
    redisLockStore.clear();
    simulator.reset();

    vi.stubEnv("AI_ASSIST_API_URL", TEST_API_URL);
    vi.stubEnv("AI_ASSIST_API_TOKEN", TEST_TOKEN);
    vi.stubEnv("AI_ASSIST_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", simulator.handleFetch);

    // Wire atomic transaction to run callback with mock transaction client
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });

    mockPrisma.tenant.create.mockImplementation(async ({ data }: any) => {
      const id = `tnt_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      mockDb.tenants.set(id, record);
      return record;
    });

    mockPrisma.tenant.findUnique.mockImplementation(async ({ where }: any) => {
      return mockDb.tenants.get(where.id) || null;
    });

    mockPrisma.tenant.findMany.mockImplementation(async () => {
      return Array.from(mockDb.tenants.values());
    });

    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      return mockDb.users.get(where.email) || null;
    });

    mockPrisma.user.create.mockImplementation(async ({ data }: any) => {
      const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), ...data };
      mockDb.users.set(data.email, record);
      return record;
    });

    mockPrisma.user.update.mockImplementation(async ({ where, data }: any) => {
      for (const [email, user] of mockDb.users.entries()) {
        if (user.id === where.id) {
          const updated = { ...user, ...data };
          mockDb.users.set(email, updated);
          return updated;
        }
      }
      return null;
    });

    mockPrisma.tenantMembership.create.mockImplementation(async ({ data }: any) => {
      const id = `mem_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, ...data };
      mockDb.memberships.set(`${data.tenantId}:${data.userId}`, record);
      return record;
    });

    mockPrisma.loanApplication.create.mockImplementation(async ({ data }: any) => {
      const id = `loan_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      mockDb.loans.set(id, record);
      return record;
    });

    mockPrisma.loanApplication.findMany.mockImplementation(async ({ where }: any) => {
      const allLoans = Array.from(mockDb.loans.values());
      return allLoans.filter((l) => {
        if (where?.tenantId && l.tenantId !== where.tenantId) return false;
        if (where?.status && l.status !== where.status) return false;
        return true;
      });
    });

    mockPrisma.auditLog.create.mockImplementation(async ({ data }: any) => {
      const id = `aud_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), ...data };
      mockDb.auditLogs.set(id, record);
      return record;
    });

    mockPrisma.lead.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id) return mockDb.leads.get(where.id) || null;
      if (where.email) {
        for (const lead of mockDb.leads.values()) {
          if (lead.email === where.email) return lead;
        }
      }
      return null;
    });

    mockPrisma.lead.findFirst.mockImplementation(async ({ where }: any) => {
      const allLeads = Array.from(mockDb.leads.values());
      return (
        allLeads.find((l) => {
          if (where?.phoneNumber?.in && Array.isArray(where.phoneNumber.in)) {
            return where.phoneNumber.in.includes(l.phoneNumber);
          }
          return false;
        }) || null
      );
    });

    mockPrisma.lead.create.mockImplementation(async ({ data }: any) => {
      const id = `lead_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      mockDb.leads.set(id, record);
      return record;
    });

    mockPrisma.lead.update.mockImplementation(async ({ where, data }: any) => {
      const lead = mockDb.leads.get(where.id);
      if (!lead) throw new Error("Lead not found");
      const updated = {
        ...lead,
        ...data,
        metadata: {
          ...lead.metadata,
          ...data.metadata,
        },
        updatedAt: new Date(),
      };
      mockDb.leads.set(where.id, updated);
      return updated;
    });

    mockPrisma.emailEvent.create.mockImplementation(async ({ data }: any) => {
      const id = `evt_${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), ...data };
      mockDb.emailEvents.set(id, record);
      return record;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STRESS TEST 1: CONCURRENT TRIAL TENANT PROVISIONING (50 CONCURRENT RUNS)
  // ══════════════════════════════════════════════════════════════════════════
  describe("1. Concurrent Trial Tenant Provisioning & Isolation Harness", () => {
    it(
      "provisions 50 trial tenants simultaneously with identical slug without name collisions or cross-pollination",
      async () => {
        const CONCURRENCY_COUNT = 50;
        const SLUG = "fairmoney";

      // Execute 50 provisioning calls concurrently with the identical institution slug
      const tasks = Array.from({ length: CONCURRENCY_COUNT }, () =>
        provisionTrialTenantCore({ institutionSlug: SLUG })
      );

      const results = await Promise.all(tasks);

      // Verify all 50 completed successfully
      expect(results).toHaveLength(CONCURRENCY_COUNT);
      for (const res of results) {
        expect(res.success).toBe(true);
        expect(res.tenant.id).toBeDefined();
        expect(res.tenant.name).toMatch(/^trial-fairmoney-[a-z0-9]+$/);
        expect(res.loans).toHaveLength(3);
      }

      // Verify 100% tenant ID uniqueness
      const tenantIds = results.map((r) => r.tenant.id);
      const uniqueTenantIds = new Set(tenantIds);
      expect(uniqueTenantIds.size).toBe(CONCURRENCY_COUNT);

      // Verify 100% tenant name uniqueness (no trial-fairmoney-* name collisions)
      const tenantNames = results.map((r) => r.tenant.name);
      const uniqueTenantNames = new Set(tenantNames);
      expect(uniqueTenantNames.size).toBe(CONCURRENCY_COUNT);

      // Verify 100% operator email uniqueness
      const operatorEmails = results.map((r) => r.user.email);
      const uniqueEmails = new Set(operatorEmails);
      expect(uniqueEmails.size).toBe(CONCURRENCY_COUNT);

      // Verify total loans seeded = exactly 3 * 50 = 150
      expect(mockDb.loans.size).toBe(150);

      // Verify strict isolation: querying loans for any tenant returns ONLY its own 3 loans
      for (const res of results) {
        const tenantLoans = await mockPrisma.loanApplication.findMany({
          where: { tenantId: res.tenant.id },
        });
        expect(tenantLoans).toHaveLength(3);
        for (const loan of tenantLoans) {
          expect(loan.tenantId).toBe(res.tenant.id);
          // Monetary precision check
          expect(loan.loanAmount).toBeInstanceOf(Prisma.Decimal);
        }
      }
    }, 30000);

    it(
      "prevents cross-pollination of synthetic exceptions across different tenant partitions",
      async () => {
        // Provision 10 tenants representing different Batch 01 institutions concurrently
        const institutions = [
          "fairmoney",
          "carbon",
          "renmoney",
          "branch",
          "kuda",
          "palmpay",
          "quidax",
          "busha",
          "yellowcard",
          "flitaa",
        ];

        const results = await Promise.all(
          institutions.map((slug) => provisionTrialTenantCore({ institutionSlug: slug }))
        );

        // Collect all loan IDs by tenant
        const loansByTenant = new Map<string, string[]>();
        for (const res of results) {
          loansByTenant.set(
            res.tenant.id,
            res.loans.map((l) => l.id)
          );
        }

        // Check intersection between any two distinct tenants is empty
        const tenantIdList = Array.from(loansByTenant.keys());
        for (let i = 0; i < tenantIdList.length; i++) {
          for (let j = i + 1; j < tenantIdList.length; j++) {
            const t1 = tenantIdList[i];
            const t2 = tenantIdList[j];
            const loans1 = new Set(loansByTenant.get(t1));
            const loans2 = loansByTenant.get(t2) || [];
            for (const l2 of loans2) {
              expect(loans1.has(l2)).toBe(false);
            }
          }
        }
      },
      20000
    );

    it("safely sanitizes adversarial and extreme slug inputs during trial provisioning", async () => {
      const adversarialInputs = [
        { institutionSlug: "UPPERCASE_SLUG" },
        { institutionSlug: "slug with spaces and symbols!@#$%^&*()" },
        { institutionSlug: "a".repeat(200) }, // excessive length
        { institutionSlug: "" }, // empty string
        { institutionSlug: "   " }, // whitespace only
        { institutionSlug: "../../../etc/passwd" }, // path traversal attempt
        { institutionSlug: "<script>alert('xss')</script>" }, // HTML tag injection
      ];

      const results = await Promise.all(
        adversarialInputs.map((input) => provisionTrialTenantCore(input))
      );

      for (const res of results) {
        expect(res.success).toBe(true);
        expect(res.tenant.name).toMatch(/^trial-[a-z0-9]+-[a-z0-9]+$/);
        // Slug length must be bounded to 20 chars
        const parts = res.tenant.name.split("-");
        expect(parts[1].length).toBeLessThanOrEqual(20);
        expect(parts[1].length).toBeGreaterThan(0);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STRESS TEST 2: MULTI-TENANT IDEMPOTENCY UNDER HIGH LOAD
  // ══════════════════════════════════════════════════════════════════════════
  describe("2. Multi-Tenant Idempotency Under High Load", () => {
    it("guarantees 50 concurrent requests with IDENTICAL Idempotency-Key across different tenants execute independently", async () => {
      const CONCURRENCY_COUNT = 50;
      const SHARED_IDEMPOTENCY_KEY = "GLOBAL-SHARED-IDEMPOTENCY-KEY-BATCH01";

      const tenantIds = Array.from({ length: CONCURRENCY_COUNT }, (_, i) => `tenant_bench_${i + 1}`);
      const handlerExecutions: string[] = [];

      // Run 50 concurrent requests with the identical Idempotency-Key across 50 distinct tenants
      const tasks = tenantIds.map((tenantId) => {
        const req = new Request("https://shadowspark.production.internal/api/v1/compliance/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": SHARED_IDEMPOTENCY_KEY,
          },
        });

        return withIdempotency(req, tenantId, async () => {
          handlerExecutions.push(tenantId);
          // simulate async workload
          await new Promise((resolve) => setTimeout(resolve, 5));
          return NextResponse.json({
            success: true,
            tenantId,
            message: `Processed for ${tenantId}`,
          });
        });
      });

      const responses = await Promise.all(tasks);

      // Verify all 50 succeeded with status 200 (no 409 IDEMPOTENCY_IN_PROGRESS across tenants!)
      expect(responses).toHaveLength(CONCURRENCY_COUNT);
      for (let i = 0; i < CONCURRENCY_COUNT; i++) {
        const res = responses[i];
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.tenantId).toBe(tenantIds[i]);
      }

      // Verify each tenant executed its handler exactly once
      expect(handlerExecutions).toHaveLength(CONCURRENCY_COUNT);
      const executedTenants = new Set(handlerExecutions);
      expect(executedTenants.size).toBe(CONCURRENCY_COUNT);
    });

    it("serializes concurrent requests for the SAME tenant and prevents duplicate handler executions", async () => {
      const TENANT_ID = "isolated_tenant_alpha";
      const KEY = "intra-tenant-concurrency-key-001";
      let executionCount = 0;

      // 10 concurrent requests for the EXACT SAME tenant and KEY
      const tasks = Array.from({ length: 10 }, () => {
        const req = new Request("https://shadowspark.production.internal/api/v1/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": KEY,
          },
        });

        return withIdempotency(req, TENANT_ID, async () => {
          executionCount++;
          // Simulate latency while holding lock
          await new Promise((resolve) => setTimeout(resolve, 20));
          return NextResponse.json({ success: true, count: executionCount });
        });
      });

      const responses = await Promise.all(tasks);

      // Exactly 1 request acquired lock and succeeded with 200, others received 409 in-progress
      const status200 = responses.filter((r) => r.status === 200);
      const status409 = responses.filter((r) => r.status === 409);

      expect(status200.length).toBe(1);
      expect(status409.length).toBe(9);
      expect(executionCount).toBe(1); // Handler called only once!
    });

    it("rejects malformed and oversized Idempotency-Key headers cleanly", async () => {
      const TENANT_ID = "tenant_format_check";
      const handler = vi.fn(async () => NextResponse.json({ ok: true }));

      // Missing header
      const reqMissing = new Request("http://localhost/api", { method: "POST" });
      const resMissing = await withIdempotency(reqMissing, TENANT_ID, handler);
      expect(resMissing.status).toBe(400);
      const bodyMissing = await resMissing.json();
      expect(bodyMissing.error.code).toBe("MISSING_IDEMPOTENCY_KEY");

      // Oversized header (> 200 chars)
      const reqOversized = new Request("http://localhost/api", {
        method: "POST",
        headers: { "Idempotency-Key": "x".repeat(201) },
      });
      const resOversized = await withIdempotency(reqOversized, TENANT_ID, handler);
      expect(resOversized.status).toBe(400);
      const bodyOversized = await resOversized.json();
      expect(bodyOversized.error.code).toBe("INVALID_IDEMPOTENCY_KEY");

      // Non-mutation methods (GET, OPTIONS) bypass idempotency check
      const reqGet = new Request("http://localhost/api", { method: "GET" });
      const resGet = await withIdempotency(reqGet, TENANT_ID, handler);
      expect(resGet.status).toBe(200);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STRESS TEST 3: OUTREACH DISPATCH ENGINE & WEBHOOK ROBUSTNESS
  // ══════════════════════════════════════════════════════════════════════════
  describe("3. Outreach Dispatch Engine Robustness", () => {
    it("handles invalid email formats and missing channel fields gracefully in dispatchOutreachEmail", async () => {
      // 1. Missing leadId AND email should reject with descriptive error
      await expect(
        dispatchOutreachEmail({ client: mockPrisma })
      ).rejects.toThrow("Either valid leadId or email must be provided");

      // 2. Dispatch with unseeded email creates lead and updates channel metadata
      const res = await dispatchOutreachEmail({
        email: "cfo@newfintech.ng",
        subject: "Pilot Offer",
        client: mockPrisma,
      });
      expect(res.success).toBe(true);
      expect(res.email).toBe("cfo@newfintech.ng");

      // 3. Dispatch to lead with null metadata
      const leadNullMeta = await mockPrisma.lead.create({
        data: {
          email: "null_meta@fintech.ng",
          metadata: null,
        },
      });

      const resNullMeta = await dispatchOutreachEmail({
        leadId: leadNullMeta.id,
        client: mockPrisma,
      });
      expect(resNullMeta.success).toBe(true);

      // Verify metadata channels email was initialized
      const updated = await mockPrisma.lead.findUnique({ where: { id: leadNullMeta.id } });
      expect(updated.metadata.channels.email.status).toBe("sent");
    });

    it("handles corrupted or missing metadata safely in logManualDispatch", async () => {
      // 1. Non-existent lead throws
      await expect(
        logManualDispatch({ leadId: "non_existent_id", channel: "linkedin", client: mockPrisma })
      ).rejects.toThrow("Lead not found");

      // 2. Lead with missing metadata
      const lead = await mockPrisma.lead.create({
        data: {
          email: "manual_dispatch_lead@fintech.ng",
          metadata: null,
        },
      });

      const res = await logManualDispatch({
        leadId: lead.id,
        channel: "whatsapp",
        status: "sent",
        notes: "Founder contacted via WhatsApp",
        client: mockPrisma,
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe("whatsapp");

      const updated = await mockPrisma.lead.findUnique({ where: { id: lead.id } });
      expect(updated.metadata.channels.whatsapp.status).toBe("sent");
      expect(updated.metadata.channels.whatsapp.notes).toBe("Founder contacted via WhatsApp");
    });

    it("verifies Meta WhatsApp Webhook GET challenge verification security", async () => {
      // 1. Unconfigured verify token
      const req1 = new NextRequest("https://shadowspark.production.internal/api/webhooks/whatsapp/meta");
      const res1 = await whatsappWebhookGet(req1);
      expect(res1.status).toBe(503);

      // Set valid verify token in env
      vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "meta_webhook_secret_token_2026");

      // 2. Valid challenge subscription
      const validUrl = new URL("https://shadowspark.production.internal/api/webhooks/whatsapp/meta");
      validUrl.searchParams.set("hub.mode", "subscribe");
      validUrl.searchParams.set("hub.verify_token", "meta_webhook_secret_token_2026");
      validUrl.searchParams.set("hub.challenge", "test_challenge_code_12345");
      const reqValid = new NextRequest(validUrl);
      const resValid = await whatsappWebhookGet(reqValid);
      expect(resValid.status).toBe(200);
      expect(await resValid.text()).toBe("test_challenge_code_12345");

      // 3. Invalid verify token
      const invalidUrl = new URL("https://shadowspark.production.internal/api/webhooks/whatsapp/meta");
      invalidUrl.searchParams.set("hub.mode", "subscribe");
      invalidUrl.searchParams.set("hub.verify_token", "WRONG_TOKEN");
      invalidUrl.searchParams.set("hub.challenge", "12345");
      const reqInvalid = new NextRequest(invalidUrl);
      const resInvalid = await whatsappWebhookGet(reqInvalid);
      expect(resInvalid.status).toBe(403);
    });

    it("stress-tests Meta WhatsApp Webhook POST with malformed phone numbers, missing payloads, and batch statuses", async () => {
      // Pre-seed a prospect with phone number
      const prospect = await mockPrisma.lead.create({
        data: {
          email: "compliance@kudabank.ng",
          phoneNumber: "+2348011223344",
          metadata: {
            channels: {
              whatsapp: { status: "pending" },
            },
          },
        },
      });

      // 1. Empty body / invalid JSON
      const reqEmpty = new NextRequest(
        "https://shadowspark.production.internal/api/webhooks/whatsapp/meta",
        { method: "POST", body: JSON.stringify({}) }
      );
      const resEmpty = await whatsappWebhookPost(reqEmpty);
      expect(resEmpty.status).toBe(200);

      // 2. Valid status delivery receipt ("delivered")
      const reqDelivered = new NextRequest(
        "https://shadowspark.production.internal/api/webhooks/whatsapp/meta",
        {
          method: "POST",
          body: JSON.stringify({
            entry: [
              {
                changes: [
                  {
                    value: {
                      statuses: [
                        {
                          id: "wamid.HBgLMjM0ODAxMTIyMzM0NBUCABIYFDNBMTA",
                          recipient_id: "2348011223344",
                          status: "delivered",
                          timestamp: "1726588800",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          }),
        }
      );
      const resDelivered = await whatsappWebhookPost(reqDelivered);
      expect(resDelivered.status).toBe(200);

      // Verify database persistence of status update
      const updatedProspect = await mockPrisma.lead.findUnique({ where: { id: prospect.id } });
      expect(updatedProspect.metadata.channels.whatsapp.deliveryStatus).toBe("delivered");

      // 3. Malformed status updates (missing recipient_id, null fields, non-matching phone)
      const reqMalformed = new NextRequest(
        "https://shadowspark.production.internal/api/webhooks/whatsapp/meta",
        {
          method: "POST",
          body: JSON.stringify({
            entry: [
              {
                changes: [
                  {
                    value: {
                      statuses: [
                        { status: "read" }, // missing recipient_id and id
                        { recipient_id: "0000000000", status: "failed" }, // non-existent phone
                        { id: "some_msg_id", status: "unknown_custom_status" },
                      ],
                    },
                  },
                ],
              },
            ],
          }),
        }
      );
      const resMalformed = await whatsappWebhookPost(reqMalformed);
      expect(resMalformed.status).toBe(200); // Should handle without 500 error
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STRESS TEST 4: ADVANCED ADVERSARIAL & UPSTREAM RESILIENCE
  // ══════════════════════════════════════════════════════════════════════════
  describe("4. Advanced Adversarial & Upstream Failure Resilience", () => {
    it("handles 20 concurrent REST requests to POST /api/sandbox/provision without route crashes", async () => {
      const { POST: provisionPost } = await import("@/app/api/sandbox/provision/route");

      const tasks = Array.from({ length: 20 }, (_, i) => {
        const req = new Request("https://shadowspark.production.internal/api/sandbox/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionSlug: "carbon",
            companyName: `Carbon Pilot Cohort ${i + 1}`,
          }),
        });
        return provisionPost(req);
      });

      const responses = await Promise.all(tasks);
      expect(responses).toHaveLength(20);

      for (const res of responses) {
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.success).toBe(true);
        expect(data.data.tenant.name).toMatch(/^trial-carbon-[a-z0-9]+$/);
        expect(data.data.loans).toHaveLength(3);
      }
    });

    it("resiliently preserves database provisioning when upstream AI-ASSIST brief creation fails", async () => {
      // Configure simulator to simulate upstream 503 outage
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          return new Response(
            JSON.stringify({ error: "SERVICE_UNAVAILABLE", message: "AI-ASSIST cold starting" }),
            { status: 503, headers: { "content-type": "application/json" } }
          );
        })
      );

      // Provisioning should still succeed at the database level
      const result = await provisionTrialTenantCore({ institutionSlug: "renmoney" });
      expect(result.success).toBe(true);
      expect(result.tenant.id).toBeDefined();
      expect(result.loans).toHaveLength(3);

      // Briefs array captures upstream failures without crashing or throwing unhandled rejection
      expect(result.briefs).toHaveLength(3);
      for (const b of result.briefs) {
        expect(b.success).toBe(false);
        expect(b.error).toBeDefined();
      }
    });

    it("survives a 100-request idempotency storm across 10 distinct tenants without cross-tenant collisions", async () => {
      const TENANT_COUNT = 10;
      const REQS_PER_TENANT = 10; // Total 100 concurrent requests
      const SHARED_KEY = "STORM-KEY-SEC26-1";

      const tenantIds = Array.from({ length: TENANT_COUNT }, (_, i) => `storm_tenant_${i + 1}`);
      const executionMap = new Map<string, number>();

      const allTasks: Promise<Response>[] = [];

      for (const tenantId of tenantIds) {
        executionMap.set(tenantId, 0);
        for (let r = 0; r < REQS_PER_TENANT; r++) {
          const req = new Request("https://shadowspark.production.internal/api/action", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": SHARED_KEY,
            },
          });

          const task = withIdempotency(req, tenantId, async () => {
            const current = executionMap.get(tenantId) || 0;
            executionMap.set(tenantId, current + 1);
            await new Promise((resolve) => setTimeout(resolve, 15));
            return NextResponse.json({
              tenantId,
              status: "PROCESSED",
              timestamp: new Date().toISOString(),
            });
          });

          allTasks.push(task);
        }
      }

      const allResponses = await Promise.all(allTasks);
      expect(allResponses).toHaveLength(TENANT_COUNT * REQS_PER_TENANT);

      // For each tenant, exactly 1 execution occurred
      for (const tenantId of tenantIds) {
        expect(executionMap.get(tenantId)).toBe(1);
      }

      // Count status codes: exactly 10 requests returned 200, 90 requests returned 409 in progress
      const count200 = allResponses.filter((r) => r.status === 200).length;
      const count409 = allResponses.filter((r) => r.status === 409).length;

      expect(count200).toBe(10);
      expect(count409).toBe(90);
    });
  });
});
