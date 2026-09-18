import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { errorResponse } from "@/lib/api/http";
import { createTestToken, authHeaders } from "../helpers/auth";

const mockRequireAuthContext = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockTenantMembershipFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/auth-context", () => ({
  requireAuthContext: mockRequireAuthContext,
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: mockTenantMembershipFindFirst,
    },
  },
}));

vi.mock("@/lib/cors", () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: vi.fn(),
}));

import { POST as createBrief } from "@/app/api/compliance/briefs/route";
import { GET as listReviews } from "@/app/api/compliance/reviews/route";
import { GET as getReview } from "@/app/api/compliance/reviews/[briefId]/route";
import { POST as annotateReview } from "@/app/api/compliance/reviews/[briefId]/annotations/route";

const TOKEN = "test-ai-assist-token-secret";
const API_URL = "https://ai-assist.example.test";
const BROWSER_BEARER = "browser-session-token-must-not-leak";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function headersFrom(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collectFiles(full));
    else files.push(full);
  }
  return files;
}

const authenticated = {
  ok: true as const,
  context: {
    userId: "user-1",
    tenantId: "tenant-1",
    role: "ADMIN",
    email: "admin@example.com",
  },
};

const briefParams = { params: Promise.resolve({ briefId: "brief-1" }) };

describe("compliance AI-ASSIST adapter routes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_ASSIST_API_URL", API_URL);
    vi.stubEnv("AI_ASSIST_API_TOKEN", TOKEN);
    vi.stubEnv("AI_ASSIST_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", fetchMock);
    mockRequireAuthContext.mockResolvedValue(authenticated);
    mockAuth.mockResolvedValue(null);
    mockTenantMembershipFindFirst.mockResolvedValue(null);
    expect(process.env.BACKEND_API_URL).toBeFalsy();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header"),
    });

    const response = await createBrief(
      new Request("http://localhost/api/compliance/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "idem-1" },
        body: JSON.stringify({ exception_id: "exc-1" }),
      })
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 on GET /api/compliance/reviews when unauthenticated", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header"),
    });

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls upstream when authenticated and injects JWT tenant as X-Tenant-ID", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { brief_id: "brief-1", output: { ok: true }, tool_trace: [], replayed: false })
    );

    const response = await createBrief(
      new Request("http://localhost/api/compliance/briefs", {
        method: "POST",
        headers: {
          ...authHeaders(await createTestToken()),
          Authorization: `Bearer ${BROWSER_BEARER}`,
          "Idempotency-Key": "idem-create-1",
          "X-Tenant-ID": "spoofed-tenant",
          "X-Request-ID": "req-inbound",
        },
        body: JSON.stringify({ exception_id: "exc-1", tenant_id: "spoofed-tenant" }),
      })
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/compliance-review-brief`);
    const headers = headersFrom(init);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("X-Tenant-ID")).not.toBe("spoofed-tenant");
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("Authorization")).not.toContain(BROWSER_BEARER);
    expect(headers.get("Idempotency-Key")).toBe("idem-create-1");
    expect(headers.get("X-Request-ID")).toBe("req-inbound");
    expect(headers.get("X-Tenant-Slug")).toBeNull();
    expect(JSON.parse(String(init.body))).toEqual({ exception_id: "exc-1" });
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(JSON.stringify(body)).not.toContain(BROWSER_BEARER);
  });

  it("fails closed when the service token is missing and never leaks a token", async () => {
    vi.stubEnv("AI_ASSIST_API_TOKEN", "");
    const response = await createBrief(
      new Request("http://localhost/api/compliance/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "idem-1" },
        body: JSON.stringify({ exception_id: "exc-1" }),
      })
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps timeout to 504 GATEWAY_TIMEOUT", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    const response = await createBrief(
      new Request("http://localhost/api/compliance/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "idem-1" },
        body: JSON.stringify({ exception_id: "exc-1" }),
      })
    );
    expect(response.status).toBe(504);
    const body = await response.json();
    expect(body.error.code).toBe("GATEWAY_TIMEOUT");
    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });

  it.each([
    [400, 400, "INVALID_BODY"],
    [401, 502, "UPSTREAM_AUTH"],
    [403, 502, "UPSTREAM_AUTH"],
    [404, 404, "NOT_FOUND"],
    [409, 409, "CONFLICT"],
    [422, 422, "UNPROCESSABLE_ENTITY"],
    [429, 429, "RATE_LIMITED"],
    [500, 502, "BAD_GATEWAY"],
  ] as const)("maps upstream %s through the review route", async (upstream, local, code) => {
    fetchMock.mockResolvedValue(jsonResponse(upstream, { detail: "nope" }));
    const response = await getReview(
      new Request("http://localhost/api/compliance/reviews/brief-1", {
        headers: { Authorization: `Bearer ${BROWSER_BEARER}` },
      }),
      briefParams
    );
    expect(response.status).toBe(local);
    const body = await response.json();
    expect(body.error.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(JSON.stringify(body)).not.toContain(BROWSER_BEARER);
    const headers = headersFrom(fetchMock.mock.calls[0]?.[1] as RequestInit);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("maps cross-tenant upstream 404 to local 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { detail: "not found" }));
    const response = await getReview(
      new Request("http://localhost/api/compliance/reviews/brief-x"),
      { params: Promise.resolve({ briefId: "brief-x" }) }
    );
    expect(response.status).toBe(404);
  });

  it("requires and forwards Idempotency-Key on annotation POST", async () => {
    const missing = await annotateReview(
      new Request("http://localhost/api/compliance/reviews/brief-1/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotation: "note" }),
      }),
      briefParams
    );
    expect(missing.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        brief_id: "brief-1",
        tenant_id: "tenant-1",
        exception_id: "exc-1",
        output: {},
        queue_state: "pending",
        sor_status_unchanged: true,
        annotations: ["note"],
        created_at: "2026-09-15T00:00:00Z",
        updated_at: "2026-09-15T00:00:00Z",
      })
    );

    const ok = await annotateReview(
      new Request("http://localhost/api/compliance/reviews/brief-1/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "ann-1" },
        body: JSON.stringify({ annotation: "note" }),
      }),
      briefParams
    );
    expect(ok.status).toBe(200);
    const headers = headersFrom(fetchMock.mock.calls[0]?.[1] as RequestInit);
    expect(headers.get("Idempotency-Key")).toBe("ann-1");
  });

  it("requires Idempotency-Key on create brief", async () => {
    const response = await createBrief(
      new Request("http://localhost/api/compliance/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exception_id: "exc-1" }),
      })
    );
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose arbitrary AI-ASSIST paths", () => {
    const complianceRoot = path.join(process.cwd(), "src/app/api/compliance");
    const files = collectFiles(complianceRoot)
      .map((file) => path.relative(complianceRoot, file).replaceAll("\\", "/"))
      .sort();
    expect(files).toEqual([
      "briefs/route.ts",
      "reviews/[briefId]/annotations/route.ts",
      "reviews/[briefId]/route.ts",
      "reviews/route.ts",
    ]);
    expect(files.some((file) => file.includes("[[..."))).toBe(false);
  });

  it("GET /api/compliance/reviews returns review queue list when authenticated", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [
          {
            brief_id: "brief-1",
            tenant_id: "tenant-1",
            exception_id: "exc-1",
            queue_state: "pending_review",
            sor_status_unchanged: true,
            created_at: "2026-09-15T00:00:00Z",
            updated_at: "2026-09-15T00:00:00Z",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      })
    );

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews?limit=25&offset=5&state=pending_review", {
        method: "GET",
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.total).toBe(1);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue?limit=25&offset=5&state=pending_review`);
    const headers = headersFrom(init);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
  });

  it("GET /api/compliance/reviews validates query parameters", async () => {
    // Invalid limit < 1
    const badLimit = await listReviews(
      new Request("http://localhost/api/compliance/reviews?limit=0")
    );
    expect(badLimit.status).toBe(400);
    const badLimitBody = await badLimit.json();
    expect(badLimitBody.error.code).toBe("INVALID_QUERY");

    // Invalid limit > 100
    const overLimit = await listReviews(
      new Request("http://localhost/api/compliance/reviews?limit=101")
    );
    expect(overLimit.status).toBe(400);

    // Non-integer limit
    const nonIntLimit = await listReviews(
      new Request("http://localhost/api/compliance/reviews?limit=abc")
    );
    expect(nonIntLimit.status).toBe(400);

    // Invalid negative offset
    const badOffset = await listReviews(
      new Request("http://localhost/api/compliance/reviews?offset=-1")
    );
    expect(badOffset.status).toBe(400);

    // Non-integer offset
    const nonIntOffset = await listReviews(
      new Request("http://localhost/api/compliance/reviews?offset=xyz")
    );
    expect(nonIntOffset.status).toBe(400);

    // Invalid state
    const badState = await listReviews(
      new Request("http://localhost/api/compliance/reviews?state=unknown_state")
    );
    expect(badState.status).toBe(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET /api/compliance/reviews maps upstream error through error response helper", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { detail: "Service Unavailable" }));

    const response = await listReviews(new Request("http://localhost/api/compliance/reviews"));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_GATEWAY");
  });

  it("bridges NextAuth session and resolves authoritative tenant from database membership", async () => {
    // Simulate browser request with NextAuth session and no Bearer token
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header"),
    });
    mockAuth.mockResolvedValue({
      user: { id: "user-session-1", role: "ADMIN", email: "operator@example.com" },
    });
    mockTenantMembershipFindFirst.mockResolvedValue({
      tenantId: "authoritative-tenant-99",
      role: "ADMIN",
    });

    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      })
    );

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        headers: {
          "X-Tenant-ID": "spoofed-tenant-must-be-ignored",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mockTenantMembershipFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-session-1" },
      select: { tenantId: true, role: true },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue`);
    const headers = headersFrom(init);
    expect(headers.get("X-Tenant-ID")).toBe("authoritative-tenant-99");
    expect(headers.get("X-Tenant-ID")).not.toBe("spoofed-tenant-must-be-ignored");
  });

  it("fails closed with 403 when NextAuth session user has no tenant membership", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header"),
    });
    mockAuth.mockResolvedValue({
      user: { id: "user-without-tenant", role: "user", email: "nobody@example.com" },
    });
    mockTenantMembershipFindFirst.mockResolvedValue(null);

    const response = await listReviews(new Request("http://localhost/api/compliance/reviews"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed with 403 when NextAuth session user has an unauthorized role", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header"),
    });
    mockAuth.mockResolvedValue({
      user: { id: "user-regular", role: "user", email: "user@example.com" },
    });
    mockTenantMembershipFindFirst.mockResolvedValue({
      tenantId: "tenant-1",
      role: "MEMBER",
    });

    const response = await listReviews(new Request("http://localhost/api/compliance/reviews"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed with 403 when Bearer token has an unauthorized role", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: true as const,
      context: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "user",
        email: "user@example.com",
      },
    });

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        headers: { Authorization: "Bearer valid-token-unauthorized-role" },
      })
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET /api/compliance/reviews strictly enforces JWT tenant over spoofed headers", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { items: [], total: 0, limit: 50, offset: 0 })
    );

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BROWSER_BEARER}`,
          "X-Tenant-ID": "attacker-spoofed-tenant",
          "X-Tenant-Slug": "attacker-spoofed-slug",
        },
      })
    );

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = headersFrom(init);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("X-Tenant-ID")).not.toBe("attacker-spoofed-tenant");
    expect(headers.get("X-Tenant-Slug")).toBeNull();
  });

  it("GET /api/compliance/reviews rejects invalid Bearer token even if session exists", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: false as const,
      response: errorResponse(401, "UNAUTHORIZED", "Invalid token signature"),
    });
    mockAuth.mockResolvedValue({
      user: { id: "user-session-1", role: "ADMIN", email: "admin@example.com" },
    });

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        headers: { Authorization: "Bearer invalid-or-expired-token" },
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.message).toBe("Invalid token signature");
    expect(mockTenantMembershipFindFirst).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET /api/compliance/reviews rejects Bearer token with unauthorized role", async () => {
    mockRequireAuthContext.mockResolvedValue({
      ok: true as const,
      context: {
        userId: "user-unauthorized",
        tenantId: "tenant-1",
        role: "USER",
        email: "user@example.com",
      },
    });

    const response = await listReviews(
      new Request("http://localhost/api/compliance/reviews", {
        headers: { Authorization: "Bearer valid-token-but-unauthorized-role" },
      })
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("Unauthorized role");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves the generic proxy unchanged", () => {
    const proxyPath = "src/app/api/proxy/[[...slug]]/route.ts";
    const diff = execFileSync("git", ["diff", "--", proxyPath], { encoding: "utf8" });
    expect(diff).toBe("");
    const tracked = execFileSync("git", ["show", `HEAD:${proxyPath}`], { encoding: "utf8" });
    expect(readFileSync(proxyPath, "utf8")).toBe(tracked);
  });
});
