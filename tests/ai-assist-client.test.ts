import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addComplianceAnnotation,
  createComplianceBrief,
  getComplianceReview,
  listComplianceReviews,
} from "@/lib/ai-assist/client";
import { AiAssistError } from "@/lib/ai-assist/errors";
import { buildAiAssistHeaders, getAiAssistConfig, resolveRequestId } from "@/lib/ai-assist/auth";

const TOKEN = "test-ai-assist-token-secret";
const API_URL = "https://ai-assist.example.test";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function headersFrom(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

describe("AI-ASSIST client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_ASSIST_API_URL", API_URL);
    vi.stubEnv("AI_ASSIST_API_TOKEN", TOKEN);
    vi.stubEnv("AI_ASSIST_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("injects the service token as Bearer and never uses BACKEND_API_URL", async () => {
    expect(process.env.BACKEND_API_URL).toBeFalsy();
    fetchMock.mockResolvedValue(
      jsonResponse(200, { brief_id: "brief-1", output: {}, tool_trace: [], replayed: false })
    );

    await createComplianceBrief({
      exceptionId: "exc-1",
      tenantId: "tenant-1",
      requestId: "req-1",
      idempotencyKey: "idem-1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/compliance-review-brief`);
    expect(url).not.toContain("backend");
    const headers = headersFrom(init);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("Idempotency-Key")).toBe("idem-1");
    expect(headers.get("X-Request-ID")).toBe("req-1");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Tenant-Slug")).toBeNull();
    expect(JSON.parse(String(init.body))).toEqual({ exception_id: "exc-1" });
  });

  it("fails closed when AI_ASSIST_API_TOKEN is missing", () => {
    vi.stubEnv("AI_ASSIST_API_TOKEN", "");
    expect(() => getAiAssistConfig()).toThrow(AiAssistError);
    try {
      getAiAssistConfig();
    } catch (error) {
      expect(error).toMatchObject({ status: 503, code: "SERVICE_UNAVAILABLE" });
      expect(String(error)).not.toContain(TOKEN);
    }
  });

  it("fails closed when AI_ASSIST_API_URL is missing", () => {
    vi.stubEnv("AI_ASSIST_API_URL", "");
    expect(() => getAiAssistConfig()).toThrow(AiAssistError);
  });

  it("maps timeout and AbortError to GATEWAY_TIMEOUT", async () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    fetchMock.mockRejectedValue(timeout);

    await expect(
      createComplianceBrief({
        exceptionId: "exc-1",
        tenantId: "tenant-1",
        requestId: "req-1",
        idempotencyKey: "idem-1",
      })
    ).rejects.toMatchObject({ status: 504, code: "GATEWAY_TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not auto-retry POST after a transport failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      createComplianceBrief({
        exceptionId: "exc-1",
        tenantId: "tenant-1",
        requestId: "req-1",
        idempotencyKey: "idem-1",
      })
    ).rejects.toBeInstanceOf(AiAssistError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries a GET once on transport failure", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          brief_id: "brief-1",
          tenant_id: "tenant-1",
          exception_id: "exc-1",
          output: {},
          queue_state: "pending",
          sor_status_unchanged: true,
          annotations: [],
          created_at: "2026-09-15T00:00:00Z",
          updated_at: "2026-09-15T00:00:00Z",
        })
      );

    const result = await getComplianceReview({
      briefId: "brief-1",
      tenantId: "tenant-1",
      requestId: "req-1",
    });

    expect(result.brief_id).toBe("brief-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = headersFrom(fetchMock.mock.calls[0]?.[1] as RequestInit);
    expect(headers.get("Idempotency-Key")).toBeNull();
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
    [503, 502, "BAD_GATEWAY"],
  ] as const)("maps upstream %s to local %s %s", async (upstream, localStatus, code) => {
    fetchMock.mockResolvedValue(jsonResponse(upstream, { detail: "nope" }));

    await expect(
      getComplianceReview({ briefId: "brief-1", tenantId: "tenant-1", requestId: "req-1" })
    ).rejects.toMatchObject({ status: localStatus, code });
  });

  it("maps cross-tenant misses as 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { detail: "not found" }));

    await expect(
      getComplianceReview({ briefId: "other-tenant-brief", tenantId: "tenant-1", requestId: "req-1" })
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("forwards annotation idempotency key and JSON body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        brief_id: "brief-1",
        tenant_id: "tenant-1",
        exception_id: "exc-1",
        output: {},
        queue_state: "pending",
        sor_status_unchanged: true,
        annotations: ["looks good"],
        created_at: "2026-09-15T00:00:00Z",
        updated_at: "2026-09-15T00:00:00Z",
      })
    );

    await addComplianceAnnotation({
      briefId: "brief-1",
      annotation: "looks good",
      tenantId: "tenant-1",
      requestId: "req-9",
      idempotencyKey: "ann-idem-1",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue/brief-1/annotations`);
    const headers = headersFrom(init);
    expect(headers.get("Idempotency-Key")).toBe("ann-idem-1");
    expect(JSON.parse(String(init.body))).toEqual({ annotation: "looks good" });
  });

  it("uses AbortSignal.timeout with the configured default", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValue(
      jsonResponse(200, { brief_id: "brief-1", output: {}, tool_trace: [], replayed: false })
    );

    await createComplianceBrief({
      exceptionId: "exc-1",
      tenantId: "tenant-1",
      requestId: "req-1",
      idempotencyKey: "idem-1",
    });

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    timeoutSpy.mockRestore();
  });

  it("buildAiAssistHeaders never copies a browser Authorization value", () => {
    const headers = buildAiAssistHeaders({
      token: TOKEN,
      tenantId: "tenant-1",
      requestId: "req-1",
      idempotencyKey: "idem-1",
      json: true,
    });
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers["X-Tenant-ID"]).toBe("tenant-1");
    expect(Object.keys(headers)).not.toContain("X-Tenant-Slug");
  });

  it("reuses inbound X-Request-ID or generates a UUID", () => {
    expect(
      resolveRequestId(new Request("http://localhost/x", { headers: { "X-Request-ID": "inbound-1" } }))
    ).toBe("inbound-1");
    expect(resolveRequestId(new Request("http://localhost/x"))).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("listComplianceReviews calls upstream review queue with query params", async () => {
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
        limit: 20,
        offset: 10,
      })
    );

    const result = await listComplianceReviews({
      limit: 20,
      offset: 10,
      state: "pending_review",
      tenantId: "tenant-1",
      requestId: "req-list-1",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].brief_id).toBe("brief-1");
    expect(result.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue?limit=20&offset=10&state=pending_review`);
    const headers = headersFrom(init);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("X-Request-ID")).toBe("req-list-1");
    expect(headers.get("Idempotency-Key")).toBeNull();
  });

  it("listComplianceReviews handles empty params and calls /v1/review-queue directly", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      })
    );

    const result = await listComplianceReviews();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue`);
  });

  it("listComplianceReviews retries once on transport failure", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("network glitch"))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [],
          total: 0,
          limit: 50,
          offset: 0,
        })
      );

    const result = await listComplianceReviews({ tenantId: "tenant-1" });
    expect(result.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listComplianceReviews maps upstream 400 to INVALID_BODY", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: "invalid state filter" }));
    await expect(
      listComplianceReviews({ tenantId: "tenant-1", state: "pending_review" })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_BODY" });
  });

  it("listComplianceReviews maps upstream 503 to BAD_GATEWAY", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { detail: "service unavailable" }));
    await expect(
      listComplianceReviews({ tenantId: "tenant-1" })
    ).rejects.toMatchObject({ status: 502, code: "BAD_GATEWAY" });
  });

  it("listComplianceReviews maps timeout to GATEWAY_TIMEOUT after retry", async () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    fetchMock.mockRejectedValue(timeout);
    await expect(
      listComplianceReviews({ tenantId: "tenant-1" })
    ).rejects.toMatchObject({ status: 504, code: "GATEWAY_TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listComplianceReviews formats pagination params correctly", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 100, offset: 0 }));
    await listComplianceReviews({ limit: 100, offset: 0, tenantId: "tenant-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/review-queue?limit=100&offset=0`);
  });
});

