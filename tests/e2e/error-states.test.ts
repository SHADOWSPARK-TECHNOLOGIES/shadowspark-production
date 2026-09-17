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

describe("E2E 10-State Error Verification (400, 401, 403, 404, 409, 422, 429, 502, 503, 504)", () => {
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

  // State 1: HTTP 400 Bad Request
  describe("State 1: HTTP 400 Bad Request", () => {
    it("returns 400 INVALID_JSON on malformed JSON payload", async () => {
      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "err-json-key",
          },
          body: "not-json-content{{{",
        })
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("INVALID_JSON");
      expect(body.error.message).toContain("Request body must be valid JSON");
    });

    it("returns 400 INVALID_BODY when required body fields are missing or empty", async () => {
      const token = await createE2EToken();

      // Briefs without exception_id
      const resBrief = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "err-body-key-1",
          },
          body: JSON.stringify({}),
        })
      );
      expect(resBrief.status).toBe(400);
      expect(((await resBrief.json()) as { error: { code: string } }).error.code).toBe("INVALID_BODY");

      // Annotation with empty annotation string
      const resAnn = await annotateReviewRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews/brief-1/annotations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "err-body-key-2",
          },
          body: JSON.stringify({ annotation: "   " }),
        }),
        { params: Promise.resolve({ briefId: "brief-1" }) }
      );
      expect(resAnn.status).toBe(400);
      expect(((await resAnn.json()) as { error: { code: string } }).error.code).toBe("INVALID_BODY");
    });

    it("returns 400 INVALID_QUERY on invalid pagination or state query parameters", async () => {
      const token = await createE2EToken();

      // limit < 1
      const resLimitLow = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews?limit=0", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(resLimitLow.status).toBe(400);
      expect(((await resLimitLow.json()) as { error: { code: string } }).error.code).toBe("INVALID_QUERY");

      // limit > 100
      const resLimitHigh = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews?limit=101", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(resLimitHigh.status).toBe(400);

      // offset < 0
      const resOffsetNeg = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews?offset=-1", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(resOffsetNeg.status).toBe(400);

      // invalid state
      const resInvalidState = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews?state=unknown_state_xyz", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(resInvalidState.status).toBe(400);
    });

    it("maps upstream 400 Bad Request to local 400", async () => {
      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "err-upstream-400-key",
          },
          body: JSON.stringify({ exception_id: "ex_trigger_upstream_400" }),
        })
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("INVALID_BODY");
    });
  });

  // State 2: HTTP 401 Unauthorized
  describe("State 2: HTTP 401 Unauthorized", () => {
    it("returns 401 UNAUTHORIZED when no authorization header or session is present", async () => {
      const res = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews")
      );
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when Bearer token signature is invalid or expired", async () => {
      // Tampered token
      const validToken = await createE2EToken();
      const parts = validToken.split(".");
      const tampered = `${parts[0]}.${parts[1]}.bad_signature_abc`;

      const resTampered = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews", {
          headers: { Authorization: `Bearer ${tampered}` },
        })
      );
      expect(resTampered.status).toBe(401);

      // Expired token
      const expired = await createE2EToken({}, -3600);
      const resExpired = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews", {
          headers: { Authorization: `Bearer ${expired}` },
        })
      );
      expect(resExpired.status).toBe(401);
    });
  });

  // State 3: HTTP 403 Forbidden
  describe("State 3: HTTP 403 Forbidden", () => {
    it("returns 403 TENANT_MISMATCH when x-tenant-slug does not match authenticated session", async () => {
      const token = await createE2EToken({ sub: "user-admin-a", tenantId: "tenant-a" });
      const res = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": "beta-fintech",
          },
        })
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("TENANT_MISMATCH");
    });

    it("returns 403 FORBIDDEN when session user lacks TenantMembership or role is unauthorized", async () => {
      // User with no membership
      mockAuth.mockResolvedValue({
        user: { id: "user-orphan", email: "orphan@example.test", role: "USER" },
      });

      const resNoMem = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews")
      );
      expect(resNoMem.status).toBe(403);
      const bodyNoMem = (await resNoMem.json()) as { error: { code: string } };
      expect(bodyNoMem.error.code).toBe("FORBIDDEN");

      // User with unauthorized role (e.g. VIEWER)
      mockAuth.mockResolvedValue({
        user: { id: "user-viewer-a", email: "viewer@acme.test", role: "VIEWER" },
      });

      const resUnauth = await listReviewsRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews")
      );
      expect(resUnauth.status).toBe(403);
      const bodyUnauth = (await resUnauth.json()) as { error: { code: string } };
      expect(bodyUnauth.error.code).toBe("FORBIDDEN");
    });
  });

  // State 4: HTTP 404 Not Found
  describe("State 4: HTTP 404 Not Found", () => {
    it("returns 404 NOT_FOUND for non-existent review or cross-tenant access", async () => {
      const token = await createE2EToken();
      const res = await getReviewRoute(
        new Request("https://shadowspark.tech/api/compliance/reviews/brief_does_not_exist", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        { params: Promise.resolve({ briefId: "brief_does_not_exist" }) }
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Review not found");
    });
  });

  // State 5: HTTP 409 Conflict
  describe("State 5: HTTP 409 Conflict", () => {
    it("returns 409 CONFLICT on idempotency key payload mismatch", async () => {
      const token = await createE2EToken();
      const idemKey = "conflict-status-check-key";

      // Call 1
      await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idemKey,
          },
          body: JSON.stringify({ exception_id: "ex_first_value" }),
        })
      );

      // Call 2 with different body
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idemKey,
          },
          body: JSON.stringify({ exception_id: "ex_different_value" }),
        })
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBe("Idempotency conflict");
    });
  });

  // State 6: HTTP 422 Unprocessable Entity
  describe("State 6: HTTP 422 Unprocessable Entity", () => {
    it("returns 422 UNPROCESSABLE_ENTITY when payload contains 11-digit national identity numbers (BVN/NIN PII guard)", async () => {
      const token = await createE2EToken();

      // Brief with 11-digit raw ID
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "pii-test-key-1",
          },
          body: JSON.stringify({ exception_id: "ex_bvn_12345678901_fail" }),
        })
      );

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("UNPROCESSABLE_ENTITY");
      expect(body.error.message).toBe("AI-ASSIST rejected the request");
    });
  });

  // State 7: HTTP 429 Too Many Requests
  describe("State 7: HTTP 429 Too Many Requests", () => {
    it("maps upstream budget trip (LLM06:2026) to 429 RATE_LIMITED", async () => {
      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "rate-limit-test-key",
          },
          body: JSON.stringify({ exception_id: "ex_trigger_upstream_429" }),
        })
      );

      expect(res.status).toBe(429);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("RATE_LIMITED");
      expect(body.error.message).toBe("AI-ASSIST rate limited the request");
    });
  });

  // State 8: HTTP 502 Bad Gateway
  describe("State 8: HTTP 502 Bad Gateway", () => {
    it("maps upstream server error (500) to 502 BAD_GATEWAY", async () => {
      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "upstream-500-key",
          },
          body: JSON.stringify({ exception_id: "ex_trigger_upstream_500" }),
        })
      );

      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("BAD_GATEWAY");
      expect(body.error.message).toBe("AI-ASSIST request failed");
    });

    it("maps upstream auth rejection to 502 UPSTREAM_AUTH", async () => {
      // Misconfigured upstream token so AI-ASSIST returns 401
      vi.stubEnv("AI_ASSIST_API_TOKEN", "wrong-upstream-token-fails");

      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "bad-upstream-token-key",
          },
          body: JSON.stringify({ exception_id: "ex_good_body" }),
        })
      );

      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("UPSTREAM_AUTH");
      expect(body.error.message).toBe("AI-ASSIST authentication failed");
    });
  });

  // State 9: HTTP 503 Service Unavailable
  describe("State 9: HTTP 503 Service Unavailable", () => {
    it("returns 503 SERVICE_UNAVAILABLE when AI-ASSIST environment variables are missing", async () => {
      vi.stubEnv("AI_ASSIST_API_TOKEN", "");

      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "unconfigured-env-key",
          },
          body: JSON.stringify({ exception_id: "ex_env_test" }),
        })
      );

      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(body.error.message).toBe("AI-ASSIST is not configured");
    });

    it("returns fail-closed 503 for passkey verification containment", async () => {
      const res = await verifyPasskeyLoginRoute(
        new Request("https://shadowspark.tech/api/auth/verify-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            challenge: "chal",
            credential: { id: "cred" },
          }),
        })
      );

      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Passkey sign-in is temporarily unavailable");
    });
  });

  // State 10: HTTP 504 Gateway Timeout
  describe("State 10: HTTP 504 Gateway Timeout", () => {
    it("maps upstream timeout / abort to 504 GATEWAY_TIMEOUT", async () => {
      // Mock fetch to simulate network timeout
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "TimeoutError")));

      const token = await createE2EToken();
      const res = await createBriefRoute(
        new Request("https://shadowspark.tech/api/compliance/briefs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "timeout-key-001",
          },
          body: JSON.stringify({ exception_id: "ex_timeout_test" }),
        })
      );

      expect(res.status).toBe(504);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("GATEWAY_TIMEOUT");
      expect(body.error.message).toBe("AI-ASSIST request timed out");
    });
  });
});
