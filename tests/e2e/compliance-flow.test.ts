import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  E2E_API_TOKEN,
  E2E_JWT_SECRET,
  createE2EToken,
  mockMemberships,
  mockTenants,
  setupE2EEnvironment,
} from "./test-env";
import { UpstreamContractSimulator } from "./upstream-simulator";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    tenant: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return mockTenants.get(where.id) ?? null;
      }),
    },
    tenantMembership: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string } }) => {
        return mockMemberships.get(where.userId) ?? null;
      }),
    },
  },
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/auth", () => ({ auth: mockAuth }));

import { POST as createBriefRoute } from "@/app/api/compliance/briefs/route";
import { GET as listReviewsRoute } from "@/app/api/compliance/reviews/route";
import { GET as getReviewRoute } from "@/app/api/compliance/reviews/[briefId]/route";
import { POST as annotateReviewRoute } from "@/app/api/compliance/reviews/[briefId]/annotations/route";

describe("E2E Compliance Flow: Lifecycle, Queue, Review & Annotation", () => {
  const simulator = new UpstreamContractSimulator();

  beforeEach(() => {
    vi.clearAllMocks();
    simulator.reset();
    setupE2EEnvironment();
    vi.stubGlobal("fetch", simulator.handleFetch);
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("completes the full compliance lifecycle: create brief -> list queue -> inspect detail -> annotate -> re-inspect", async () => {
    const token = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    // Step 1: Submit compliance review brief
    const createReq = new Request("https://shadowspark.tech/api/compliance/briefs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "e2e-idem-brief-001",
        "X-Request-ID": "req-trace-001",
      },
      body: JSON.stringify({ exception_id: "ex_kyc_mismatch_442" }),
    });

    const createRes = await createBriefRoute(createReq);
    expect(createRes.status).toBe(200);

    const createBody = (await createRes.json()) as {
      success: boolean;
      data: {
        brief_id: string;
        output: {
          exception_id: string;
          status: string;
          brief?: { summary: string; risk_flags: string[]; recommendation: string };
        };
        tool_trace: Array<{ tool: string; result: string }>;
        replayed: boolean;
      };
    };

    expect(createBody.success).toBe(true);
    expect(createBody.data.brief_id).toMatch(/^brief_tenant-a_/);
    expect(createBody.data.output.exception_id).toBe("ex_kyc_mismatch_442");
    expect(createBody.data.replayed).toBe(false);

    const createdBriefId = createBody.data.brief_id;

    // Step 2: List review queue and verify item is listed with state 'pending_review'
    const listReq = new Request("https://shadowspark.tech/api/compliance/reviews?limit=10&offset=0", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const listRes = await listReviewsRoute(listReq);
    expect(listRes.status).toBe(200);

    const listBody = (await listRes.json()) as {
      success: boolean;
      data: {
        items: Array<{
          brief_id: string;
          tenant_id: string;
          exception_id: string;
          queue_state: string;
        }>;
        total: number;
        limit: number;
        offset: number;
      };
    };

    expect(listBody.success).toBe(true);
    expect(listBody.data.total).toBe(1);
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.items[0].brief_id).toBe(createdBriefId);
    expect(listBody.data.items[0].queue_state).toBe("pending_review");

    // Step 3: Inspect specific review item detail
    const detailReq = new Request(`https://shadowspark.tech/api/compliance/reviews/${createdBriefId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const detailRes = await getReviewRoute(detailReq, {
      params: Promise.resolve({ briefId: createdBriefId }),
    });
    expect(detailRes.status).toBe(200);

    const detailBody = (await detailRes.json()) as {
      success: boolean;
      data: {
        brief_id: string;
        tenant_id: string;
        queue_state: string;
        sor_status_unchanged: boolean;
        annotations: unknown[];
      };
    };

    expect(detailBody.success).toBe(true);
    expect(detailBody.data.brief_id).toBe(createdBriefId);
    expect(detailBody.data.tenant_id).toBe("tenant-a");
    expect(detailBody.data.queue_state).toBe("pending_review");
    expect(detailBody.data.sor_status_unchanged).toBe(true);
    expect(detailBody.data.annotations).toHaveLength(0);

    // Step 4: Submit operator audit annotation
    const annotateReq = new Request(
      `https://shadowspark.tech/api/compliance/reviews/${createdBriefId}/annotations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "e2e-idem-ann-001",
        },
        body: JSON.stringify({
          annotation: "Reviewed by Tier 2 Compliance Officer. False positive resolved.",
        }),
      }
    );

    const annotateRes = await annotateReviewRoute(annotateReq, {
      params: Promise.resolve({ briefId: createdBriefId }),
    });
    expect(annotateRes.status).toBe(200);

    const annotateBody = (await annotateRes.json()) as {
      success: boolean;
      data: {
        brief_id: string;
        queue_state: string;
        annotations: Array<{
          annotation_id: string;
          operator_id: string;
          annotation: string;
        }>;
      };
    };

    expect(annotateBody.success).toBe(true);
    expect(annotateBody.data.queue_state).toBe("annotated");
    expect(annotateBody.data.annotations).toHaveLength(1);
    expect(annotateBody.data.annotations[0].annotation).toContain("Tier 2 Compliance Officer");

    // Step 5: Verify item state persisted when re-reading review detail
    const reInspectReq = new Request(`https://shadowspark.tech/api/compliance/reviews/${createdBriefId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const reInspectRes = await getReviewRoute(reInspectReq, {
      params: Promise.resolve({ briefId: createdBriefId }),
    });
    expect(reInspectRes.status).toBe(200);

    const reInspectBody = (await reInspectRes.json()) as {
      success: boolean;
      data: {
        brief_id: string;
        queue_state: string;
        annotations: Array<{ annotation: string }>;
      };
    };

    expect(reInspectBody.data.queue_state).toBe("annotated");
    expect(reInspectBody.data.annotations).toHaveLength(1);

    // Step 6: Verify queue state filtering (?state=annotated vs ?state=pending_review)
    const annotatedListRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews?state=annotated", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const annotatedListBody = (await annotatedListRes.json()) as {
      success: boolean;
      data: { total: number; items: Array<{ brief_id: string }> };
    };
    expect(annotatedListBody.data.total).toBe(1);
    expect(annotatedListBody.data.items[0].brief_id).toBe(createdBriefId);

    const pendingListRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews?state=pending_review", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const pendingListBody = (await pendingListRes.json()) as {
      success: boolean;
      data: { total: number };
    };
    expect(pendingListBody.data.total).toBe(0);
  });

  it("supports pagination across multiple queue entries", async () => {
    const token = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    // Create 3 briefs
    for (let i = 1; i <= 3; i++) {
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `pagination-idem-${i}`,
          },
          body: JSON.stringify({ exception_id: `ex_batch_${i}` }),
        })
      );
      expect(res.status).toBe(200);
    }

    // Page 1: limit 2, offset 0
    const page1Res = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews?limit=2&offset=0", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const page1 = (await page1Res.json()) as {
      success: boolean;
      data: { total: number; limit: number; offset: number; items: unknown[] };
    };
    expect(page1.data.total).toBe(3);
    expect(page1.data.items).toHaveLength(2);
    expect(page1.data.offset).toBe(0);

    // Page 2: limit 2, offset 2
    const page2Res = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews?limit=2&offset=2", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const page2 = (await page2Res.json()) as {
      success: boolean;
      data: { total: number; limit: number; offset: number; items: unknown[] };
    };
    expect(page2.data.total).toBe(3);
    expect(page2.data.items).toHaveLength(1);
    expect(page2.data.offset).toBe(2);
  });

  it("supports browser session authentication via NextAuth cookies and database TenantMembership", async () => {
    // Simulate browser request without Bearer token, but with valid NextAuth session
    mockAuth.mockResolvedValue({
      user: {
        id: "user-admin-a",
        email: "admin@acme.test",
        role: "ADMIN",
      },
    });

    const createRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "session-auth-idem-1",
        },
        body: JSON.stringify({ exception_id: "ex_session_flow_01" }),
      })
    );

    expect(createRes.status).toBe(200);
    const body = (await createRes.json()) as {
      success: boolean;
      data: { brief_id: string; output: { exception_id: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.brief_id).toMatch(/^brief_tenant-a_/);
  });

  it("strictly preserves secret hygiene: upstream token is never leaked to response or client", async () => {
    const token = await createE2EToken();
    const res = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "secret-leak-check-idem",
        },
        body: JSON.stringify({ exception_id: "ex_leak_test_01" }),
      })
    );

    expect(res.status).toBe(200);
    const rawText = await res.text();

    expect(rawText).not.toContain(E2E_API_TOKEN);
    expect(rawText).not.toContain(E2E_JWT_SECRET);
  });
});
