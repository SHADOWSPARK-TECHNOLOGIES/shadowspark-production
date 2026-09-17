import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createE2EToken,
  mockMemberships,
  mockTenants,
  setupE2EEnvironment,
} from "./test-env";
import { UpstreamContractSimulator } from "./upstream-simulator";

const { mockPrisma, mockAuth, mockSignIn } = vi.hoisted(() => ({
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
    webAuthnChallenge: {
      findUnique: vi.fn().mockResolvedValue({
        id: "chal-1",
        challenge: "test-challenge",
        userId: "user-1",
        type: "authentication",
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.test",
        role: "user",
        passkeys: [{ id: "pk-1", credentialId: "cred-1", counter: BigInt(0) }],
      }),
    },
    passkey: {
      update: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockSignIn: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/auth", () => ({ auth: mockAuth, signIn: mockSignIn }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST as createBriefRoute } from "@/app/api/compliance/briefs/route";
import { GET as listReviewsRoute } from "@/app/api/compliance/reviews/route";
import { GET as getReviewRoute } from "@/app/api/compliance/reviews/[briefId]/route";
import { POST as annotateReviewRoute } from "@/app/api/compliance/reviews/[briefId]/annotations/route";
import { POST as verifyPasskeyLoginRoute } from "@/app/api/auth/verify-login/route";

describe("E2E Tenant Isolation & Security Boundary", () => {
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

  it("enforces cross-tenant isolation: Tenant B cannot inspect or enumerate Tenant A's review (indistinguishable 404)", async () => {
    const tokenA = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    const tokenB = await createE2EToken({
      sub: "user-comp-b",
      tenantId: "tenant-b",
      role: "COMPLIANCE",
    });

    // Tenant A creates a brief
    const createRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "isolation-brief-a",
        },
        body: JSON.stringify({ exception_id: "ex_confidential_tenant_a" }),
      })
    );
    expect(createRes.status).toBe(200);
    const { data: briefA } = (await createRes.json()) as { data: { brief_id: string } };

    // Tenant A can retrieve their own review
    const getResA = await getReviewRoute(
      new Request(`https://shadowspark.tech/api/compliance/reviews/${briefA.brief_id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
      { params: Promise.resolve({ briefId: briefA.brief_id }) }
    );
    expect(getResA.status).toBe(200);

    // Tenant B attempts to retrieve Tenant A's review
    const getResB = await getReviewRoute(
      new Request(`https://shadowspark.tech/api/compliance/reviews/${briefA.brief_id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenB}` },
      }),
      { params: Promise.resolve({ briefId: briefA.brief_id }) }
    );
    expect(getResB.status).toBe(404);
    const errBodyB = (await getResB.json()) as { error: { code: string; message: string } };
    expect(errBodyB.error.code).toBe("NOT_FOUND");

    // Non-existent ID returns the exact same 404 shape and message (anti-enumeration)
    const getResFake = await getReviewRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews/brief_non_existent_9999", {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenB}` },
      }),
      { params: Promise.resolve({ briefId: "brief_non_existent_9999" }) }
    );
    expect(getResFake.status).toBe(404);
    const errBodyFake = (await getResFake.json()) as { error: { code: string; message: string } };
    expect(errBodyB.error).toEqual(errBodyFake.error);
  });

  it("prevents cross-tenant mutation: Tenant B cannot annotate Tenant A's review", async () => {
    const tokenA = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    const tokenB = await createE2EToken({
      sub: "user-comp-b",
      tenantId: "tenant-b",
      role: "COMPLIANCE",
    });

    // Tenant A creates a brief
    const createRes = await createBriefRoute(
      new Request("https://shadowspark.tech/api/compliance/briefs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "annotate-isolation-brief-a",
        },
        body: JSON.stringify({ exception_id: "ex_sovereign_01" }),
      })
    );
    const { data: briefA } = (await createRes.json()) as { data: { brief_id: string } };

    // Tenant B attempts to annotate Tenant A's brief
    const annotateResB = await annotateReviewRoute(
      new Request(`https://shadowspark.tech/api/compliance/reviews/${briefA.brief_id}/annotations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "malicious-annotate-001",
        },
        body: JSON.stringify({ annotation: "Malicious cross-tenant override attempt" }),
      }),
      { params: Promise.resolve({ briefId: briefA.brief_id }) }
    );

    expect(annotateResB.status).toBe(404);

    // Verify Tenant A's brief remains unannotated
    const inspectResA = await getReviewRoute(
      new Request(`https://shadowspark.tech/api/compliance/reviews/${briefA.brief_id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
      { params: Promise.resolve({ briefId: briefA.brief_id }) }
    );
    const inspectBodyA = (await inspectResA.json()) as {
      data: { queue_state: string; annotations: unknown[] };
    };
    expect(inspectBodyA.data.queue_state).toBe("pending_review");
    expect(inspectBodyA.data.annotations).toHaveLength(0);
  });

  it("isolates review queue listings: Tenant B sees zero records from Tenant A", async () => {
    const tokenA = await createE2EToken({ sub: "user-admin-a", tenantId: "tenant-a" });
    const tokenB = await createE2EToken({ sub: "user-comp-b", tenantId: "tenant-b" });

    // Create 2 briefs for Tenant A
    for (let i = 1; i <= 2; i++) {
      await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenA}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `tenant-a-brief-${i}`,
          },
          body: JSON.stringify({ exception_id: `ex_tenant_a_${i}` }),
        })
      );
    }

    // Tenant B queries review queue
    const listResB = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews", {
        headers: { Authorization: `Bearer ${tokenB}` },
      })
    );
    expect(listResB.status).toBe(200);
    const listBodyB = (await listResB.json()) as { data: { total: number; items: unknown[] } };
    expect(listBodyB.data.total).toBe(0);
    expect(listBodyB.data.items).toHaveLength(0);
  });

  it("rejects tenant mismatch when client-supplied x-tenant-slug does not match authenticated session (403)", async () => {
    const tokenA = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    // Client authenticated as tenant-a (acme-corp), but provides header for tenant-b (beta-fintech)
    const mismatchReq = new Request("https://shadowspark.tech/api/compliance/reviews", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "x-tenant-slug": "beta-fintech",
      },
    });

    const res = await listReviewsRoute(mismatchReq);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("TENANT_MISMATCH");
    expect(body.error.message).toContain("Tenant slug does not match");
  });

  it("accepts matching x-tenant-slug corresponding to authenticated session", async () => {
    const tokenA = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    // Valid matching header
    const matchReq = new Request("https://shadowspark.tech/api/compliance/reviews", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "x-tenant-slug": "acme-corp",
      },
    });

    const res = await listReviewsRoute(matchReq);
    expect(res.status).toBe(200);
  });

  it("ignores client-spoofed X-Tenant-ID header and derives tenant strictly from server context", async () => {
    const tokenA = await createE2EToken({
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    });

    // Attacker tries to inject X-Tenant-ID: tenant-b in request headers
    const spoofReq = new Request("https://shadowspark.tech/api/compliance/briefs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "spoof-tenant-header-test",
        "X-Tenant-ID": "tenant-b",
      },
      body: JSON.stringify({ exception_id: "ex_spoof_header" }),
    });

    const res = await createBriefRoute(spoofReq);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { brief_id: string } };

    // Brief was created for tenant-a (derived from JWT), NOT tenant-b
    expect(body.data.brief_id).toMatch(/^brief_tenant-a_/);
  });

  it("fails closed (401 UNAUTHORIZED) when unauthenticated or token signature is tampered", async () => {
    // 1. Missing Authorization header
    const noAuthRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews")
    );
    expect(noAuthRes.status).toBe(401);
    expect(((await noAuthRes.json()) as { error: { code: string } }).error.code).toBe("UNAUTHORIZED");

    // 2. Tampered JWT signature
    const validToken = await createE2EToken();
    const parts = validToken.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.tampered_invalid_signature_xyz`;

    const tamperedRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews", {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      })
    );
    expect(tamperedRes.status).toBe(401);

    // 3. Expired token
    const expiredToken = await createE2EToken({ sub: "user-a" }, -3600);
    const expiredRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews", {
        headers: { Authorization: `Bearer ${expiredToken}` },
      })
    );
    expect(expiredRes.status).toBe(401);
  });

  it("fails closed (403 FORBIDDEN) when session user has no database TenantMembership or unauthorized role", async () => {
    // 1. User without TenantMembership
    mockAuth.mockResolvedValue({
      user: { id: "user-orphan", email: "orphan@test.com", role: "USER" },
    });

    const noMembershipRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews")
    );
    expect(noMembershipRes.status).toBe(403);
    const noMemBody = (await noMembershipRes.json()) as { error: { code: string; message: string } };
    expect(noMemBody.error.code).toBe("FORBIDDEN");
    expect(noMemBody.error.message).toContain("Tenant membership required");

    // 2. User with unauthorized role (e.g. VIEWER)
    mockAuth.mockResolvedValue({
      user: { id: "user-viewer-a", email: "viewer@acme.test", role: "VIEWER" },
    });

    const unauthRoleRes = await listReviewsRoute(
      new Request("https://shadowspark.tech/api/compliance/reviews")
    );
    expect(unauthRoleRes.status).toBe(403);
    const unauthBody = (await unauthRoleRes.json()) as { error: { code: string; message: string } };
    expect(unauthBody.error.code).toBe("FORBIDDEN");
    expect(unauthBody.error.message).toContain("Unauthorized role for compliance operations");
  });

  it("enforces passkey login containment: POST /api/auth/verify-login returns fail-closed 503", async () => {
    const passkeyReq = new Request("https://shadowspark.tech/api/auth/verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.test",
        challenge: "test-challenge",
        credential: {
          id: "cred-1",
          response: {
            clientDataJSON: Buffer.from(
              JSON.stringify({
                challenge: "test-challenge",
                type: "webauthn.get",
                origin: "https://shadowspark-tech.org",
              })
            ).toString("base64url"),
            signatureCounter: 0,
          },
        },
      }),
    });

    const res = await verifyPasskeyLoginRoute(passkeyReq);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Passkey sign-in is temporarily unavailable");
  });
});
