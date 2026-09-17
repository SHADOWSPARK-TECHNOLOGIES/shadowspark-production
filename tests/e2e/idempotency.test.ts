import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
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

describe("E2E Idempotency Guarantees & Replay Safety", () => {
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

  it("requires Idempotency-Key on mutating brief POST requests (fails with 400)", async () => {
    const token = await createE2EToken();

    // 1. Missing header
    const missingReq = new Request("https://shadowspark.tech/api/compliance/briefs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exception_id: "ex_no_idem" }),
    });

    const missingRes = await createBriefRoute(missingReq);
    expect(missingRes.status).toBe(400);
    const missingBody = (await missingRes.json()) as { error: { code: string; message: string } };
    expect(missingBody.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
    expect(missingBody.error.message).toContain("Idempotency-Key header is required");

    // 2. Empty/whitespace header
    const blankReq = new Request("https://shadowspark.tech/api/compliance/briefs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "   ",
      },
      body: JSON.stringify({ exception_id: "ex_blank_idem" }),
    });

    const blankRes = await createBriefRoute(blankReq);
    expect(blankRes.status).toBe(400);
    const blankBody = (await blankRes.json()) as { error: { code: string } };
    expect(blankBody.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  it("requires Idempotency-Key on mutating annotation POST requests (fails with 400)", async () => {
    const token = await createE2EToken();

    // Missing header on annotation
    const missingReq = new Request("https://shadowspark.tech/api/compliance/reviews/brief-1/annotations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ annotation: "Some note" }),
    });

    const res = await annotateReviewRoute(missingReq, {
      params: Promise.resolve({ briefId: "brief-1" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  it("does NOT require Idempotency-Key on non-mutating GET requests", async () => {
    const token = await createE2EToken();

    const listRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(listRes.status).toBe(200);

    const getRes = await getReviewRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews/brief-nonexistent", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ briefId: "brief-nonexistent" }) }
    );
    // Not found, but NOT missing idempotency key
    expect(getRes.status).toBe(404);
  });

  it("returns cached replay for identical brief creation without duplicating records", async () => {
    const token = await createE2EToken();
    const idempotencyKey = "replay-test-brief-key-99";

    const createRequest = () =>
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ exception_id: "ex_idem_replay_001" }),
      });

    // First call
    const firstRes = await createBriefRoute(createRequest());
    expect(firstRes.status).toBe(200);
    const firstBody = (await firstRes.json()) as {
      data: { brief_id: string; replayed: boolean; output: { exception_id: string } };
    };
    expect(firstBody.data.replayed).toBe(false);

    // Second call (replay)
    const secondRes = await createBriefRoute(createRequest());
    expect(secondRes.status).toBe(200);
    const secondBody = (await secondRes.json()) as {
      data: { brief_id: string; replayed: boolean; output: { exception_id: string } };
    };
    expect(secondBody.data.replayed).toBe(true);
    expect(secondBody.data.brief_id).toBe(firstBody.data.brief_id);
    expect(secondBody.data.output.exception_id).toBe("ex_idem_replay_001");

    // Verify queue in upstream contains strictly 1 item
    const listRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const listBody = (await listRes.json()) as { data: { total: number; items: unknown[] } };
    expect(listBody.data.total).toBe(1);
    expect(listBody.data.items).toHaveLength(1);
  });

  it("returns consistent replay on annotation without duplicate insertions", async () => {
    const token = await createE2EToken();

    // Create a brief first
    const briefRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "ann-setup-brief-key",
        },
        body: JSON.stringify({ exception_id: "ex_ann_replay" }),
      })
    );
    const { data: brief } = (await briefRes.json()) as { data: { brief_id: string } };

    const idempotencyKey = "replay-test-ann-key-77";
    const annotateRequest = () =>
      new Request(`https://shadowspark.tech/api/compliance/reviews/${brief.brief_id}/annotations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ annotation: "Risk mitigated by collateral increase." }),
      });

    // First call
    const firstRes = await annotateReviewRoute(annotateRequest(), {
      params: Promise.resolve({ briefId: brief.brief_id }),
    });
    expect(firstRes.status).toBe(200);
    const firstBody = (await firstRes.json()) as {
      data: { annotations: Array<{ annotation: string }> };
    };
    expect(firstBody.data.annotations).toHaveLength(1);

    // Second call with same idempotency key and same annotation
    const secondRes = await annotateReviewRoute(annotateRequest(), {
      params: Promise.resolve({ briefId: brief.brief_id }),
    });
    expect(secondRes.status).toBe(200);
    const secondBody = (await secondRes.json()) as {
      data: { annotations: Array<{ annotation: string }> };
    };

    // Exactly 1 annotation exists (no duplicate added)
    expect(secondBody.data.annotations).toHaveLength(1);
    expect(secondBody.data.annotations[0].annotation).toBe(firstBody.data.annotations[0].annotation);
  });

  it("detects and rejects idempotency conflict when same key is reused with differing payload (409 CONFLICT)", async () => {
    const token = await createE2EToken();
    const idempotencyKey = "conflict-idem-key-123";

    // First request with payload A
    const firstRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ exception_id: "ex_payload_A" }),
      })
    );
    expect(firstRes.status).toBe(200);

    // Second request with SAME key, but DIFFERENT payload B
    const secondRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ exception_id: "ex_payload_B" }),
      })
    );

    expect(secondRes.status).toBe(409);
    const conflictBody = (await secondRes.json()) as { error: { code: string; message: string } };
    expect(conflictBody.error.code).toBe("CONFLICT");
  });

  it("ensures multi-tenant idempotency isolation: two tenants using the identical Idempotency-Key succeed without collision", async () => {
    const tokenA = await createE2EToken({ sub: "user-admin-a", tenantId: "tenant-a" });
    const tokenB = await createE2EToken({ sub: "user-comp-b", tenantId: "tenant-b" });
    const sharedKey = "shared-global-idempotency-key-001";

    // Tenant A sends request with sharedKey
    const resA = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
          "Idempotency-Key": sharedKey,
        },
        body: JSON.stringify({ exception_id: "ex_tenant_a_unique" }),
      })
    );
    expect(resA.status).toBe(200);
    const bodyA = (await resA.json()) as { data: { brief_id: string; output: { exception_id: string } } };
    expect(bodyA.data.brief_id).toMatch(/^brief_tenant-a_/);
    expect(bodyA.data.output.exception_id).toBe("ex_tenant_a_unique");

    // Tenant B sends request with the EXACT SAME sharedKey and DIFFERENT exception_id
    const resB = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
          "Idempotency-Key": sharedKey,
        },
        body: JSON.stringify({ exception_id: "ex_tenant_b_unique" }),
      })
    );

    // Tenant B succeeds without 409 conflict because keys are strictly scoped per tenant!
    expect(resB.status).toBe(200);
    const bodyB = (await resB.json()) as { data: { brief_id: string; output: { exception_id: string } } };
    expect(bodyB.data.brief_id).toMatch(/^brief_tenant-b_/);
    expect(bodyB.data.output.exception_id).toBe("ex_tenant_b_unique");
  });

  it("rejects oversized Idempotency-Key (>128 chars) with 400 Bad Request", async () => {
    const token = await createE2EToken();
    const oversizedKey = "k".repeat(129);

    const res = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": oversizedKey,
        },
        body: JSON.stringify({ exception_id: "ex_oversized_key" }),
      })
    );

    expect(res.status).toBe(400);
  });
});
