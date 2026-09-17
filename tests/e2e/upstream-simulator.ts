/**
 * In-memory upstream simulator implementing the frozen AI-ASSIST v1.1.0 contract.
 * Verified against commit e4385628c9fffcacc904d7b963a594aa206015bf.
 */

export interface SimulatorReviewItem {
  brief_id: string;
  tenant_id: string;
  exception_id: string;
  output: {
    exception_id: string;
    status: string;
    brief?: {
      summary: string;
      risk_flags: string[];
      recommendation: string;
    };
  };
  queue_state: "pending_review" | "annotated";
  sor_status_unchanged: true;
  annotations: Array<{
    annotation_id: string;
    operator_id: string;
    annotation: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface BriefIdempotencyRecord {
  exceptionId: string;
  response: {
    brief_id: string;
    output: unknown;
    tool_trace: Array<{ tool: string; result: string }>;
    replayed: boolean;
  };
}

export interface AnnotationIdempotencyRecord {
  annotationText: string;
  response: SimulatorReviewItem;
}

export class UpstreamContractSimulator {
  public reviews: Map<string, SimulatorReviewItem> = new Map();
  public briefIdempotency: Map<string, BriefIdempotencyRecord> = new Map();
  public annotationIdempotency: Map<string, AnnotationIdempotencyRecord> = new Map();
  private briefCounter = 0;
  private annotationCounter = 0;

  constructor(
    public readonly expectedToken: string = "ai-assist-server-token-super-secret",
    public readonly expectedBaseUrl: string = "https://ai-assist.production.internal"
  ) {}

  public reset(): void {
    this.reviews.clear();
    this.briefIdempotency.clear();
    this.annotationIdempotency.clear();
    this.briefCounter = 0;
    this.annotationCounter = 0;
  }

  public handleFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);

    if (!urlStr.startsWith(this.expectedBaseUrl)) {
      return new Response(JSON.stringify({ detail: "Not found" }), { status: 404 });
    }

    const url = new URL(urlStr);
    const pathname = url.pathname;

    // Check upstream authorization
    const authHeader = headers.get("authorization") ?? "";
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || token !== this.expectedToken) {
      return new Response(JSON.stringify({ detail: "authentication failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check tenant header (X-Tenant-ID or X-Tenant-Slug)
    const tenantId = headers.get("x-tenant-id") || headers.get("x-tenant-slug");
    if (!tenantId || tenantId.trim().length === 0) {
      return new Response(JSON.stringify({ detail: "tenant identifier required in production" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tenantRegex = /^[a-z0-9][a-z0-9_-]{0,63}$/;
    if (!tenantRegex.test(tenantId)) {
      return new Response(JSON.stringify({ detail: "invalid tenant identifier" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Router
    if (pathname === "/v1/compliance-review-brief" && method === "POST") {
      return this.handleCreateBrief(headers, tenantId, init?.body);
    }

    if (pathname === "/v1/review-queue" && method === "GET") {
      return this.handleListReviewQueue(url, tenantId);
    }

    const reviewDetailMatch = pathname.match(/^\/v1\/review-queue\/([^/]+)$/);
    if (reviewDetailMatch && method === "GET") {
      const briefId = decodeURIComponent(reviewDetailMatch[1]);
      return this.handleGetReviewDetail(briefId, tenantId);
    }

    const annotationMatch = pathname.match(/^\/v1\/review-queue\/([^/]+)\/annotations$/);
    if (annotationMatch && method === "POST") {
      const briefId = decodeURIComponent(annotationMatch[1]);
      return this.handleAddAnnotation(headers, briefId, tenantId, init?.body);
    }

    return new Response(JSON.stringify({ detail: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };

  private async handleCreateBrief(
    headers: Headers,
    tenantId: string,
    rawBody: BodyInit | null | undefined
  ): Promise<Response> {
    const idempotencyKey = headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return new Response(JSON.stringify({ detail: "Idempotency-Key required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ detail: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const exceptionId = parsedBody.exception_id;
    if (typeof exceptionId !== "string" || exceptionId.trim().length === 0) {
      return new Response(JSON.stringify({ detail: "exception_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // PII Guard: 11-digit national identity numbers
    const elevenDigitPii = /(?<!\d)\d{11}(?!\d)/;
    if (elevenDigitPii.test(exceptionId)) {
      return new Response(JSON.stringify({ detail: "raw identifier not accepted" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Simulating specific test scenarios
    if (exceptionId === "ex_trigger_upstream_400") {
      return new Response(JSON.stringify({ detail: "invalid exception parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (exceptionId === "ex_trigger_upstream_500") {
      return new Response(JSON.stringify({ detail: "upstream internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (exceptionId === "ex_trigger_upstream_429") {
      return new Response(
        JSON.stringify({
          brief_id: "brief_rate_limited",
          output: {
            exception_id: exceptionId,
            status: "blocked",
            brief: {
              summary: "Budget exceeded",
              risk_flags: ["LLM06:2026"],
              recommendation: "block",
            },
          },
          tool_trace: [],
          replayed: false,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Idempotency check: scoped by (tenantId, idempotencyKey)
    const compositeKey = `${tenantId}:${idempotencyKey}`;
    const existing = this.briefIdempotency.get(compositeKey);
    if (existing) {
      if (existing.exceptionId === exceptionId) {
        return new Response(
          JSON.stringify({
            ...existing.response,
            replayed: true,
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        return new Response(JSON.stringify({ detail: "idempotency key conflict" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    this.briefCounter += 1;
    const briefId = `brief_${tenantId}_${this.briefCounter.toString().padStart(4, "0")}`;
    const nowIso = new Date().toISOString();

    const reviewItem: SimulatorReviewItem = {
      brief_id: briefId,
      tenant_id: tenantId,
      exception_id: exceptionId,
      output: {
        exception_id: exceptionId,
        status: "review_required",
        brief: {
          summary: `Automated compliance evaluation for ${exceptionId}`,
          risk_flags: ["AML_FLAG_01"],
          recommendation: "escalate_to_operator",
        },
      },
      queue_state: "pending_review",
      sor_status_unchanged: true,
      annotations: [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.reviews.set(briefId, reviewItem);

    const responsePayload = {
      brief_id: briefId,
      output: reviewItem.output,
      tool_trace: [{ tool: "read_exception", result: "ok" }],
      replayed: false,
    };

    this.briefIdempotency.set(compositeKey, {
      exceptionId,
      response: responsePayload,
    });

    return new Response(JSON.stringify(responsePayload), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleListReviewQueue(url: URL, tenantId: string): Response {
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const stateParam = url.searchParams.get("state");

    let limit = 50;
    if (limitParam !== null) {
      const parsed = Number(limitParam);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        return new Response(JSON.stringify({ detail: "invalid limit parameter" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      limit = parsed;
    }

    let offset = 0;
    if (offsetParam !== null) {
      const parsed = Number(offsetParam);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return new Response(JSON.stringify({ detail: "invalid offset parameter" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      offset = parsed;
    }

    if (stateParam !== null && stateParam !== "pending_review" && stateParam !== "annotated") {
      return new Response(JSON.stringify({ detail: "invalid state filter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter by tenantId strictly
    const tenantItems = Array.from(this.reviews.values())
      .filter((r) => r.tenant_id === tenantId)
      .filter((r) => (stateParam ? r.queue_state === stateParam : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = tenantItems.length;
    const paged = tenantItems.slice(offset, offset + limit).map((r) => ({
      brief_id: r.brief_id,
      tenant_id: r.tenant_id,
      exception_id: r.exception_id,
      queue_state: r.queue_state,
      sor_status_unchanged: r.sor_status_unchanged,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return new Response(
      JSON.stringify({
        items: paged,
        total,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private handleGetReviewDetail(briefId: string, tenantId: string): Response {
    const item = this.reviews.get(briefId);
    // Indistinguishable 404 if item does not exist OR belongs to another tenant
    if (!item || item.tenant_id !== tenantId) {
      return new Response(JSON.stringify({ detail: "review not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleAddAnnotation(
    headers: Headers,
    briefId: string,
    tenantId: string,
    rawBody: BodyInit | null | undefined
  ): Promise<Response> {
    const idempotencyKey = headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return new Response(JSON.stringify({ detail: "Idempotency-Key required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const item = this.reviews.get(briefId);
    // Indistinguishable 404 if item does not exist OR belongs to another tenant
    if (!item || item.tenant_id !== tenantId) {
      return new Response(JSON.stringify({ detail: "review not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ detail: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const annotation = parsedBody.annotation;
    if (typeof annotation !== "string" || annotation.trim().length === 0 || annotation.length > 2000) {
      return new Response(JSON.stringify({ detail: "annotation is required and must be 1-2000 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // PII Guard
    const elevenDigitPii = /(?<!\d)\d{11}(?!\d)/;
    if (elevenDigitPii.test(annotation)) {
      return new Response(JSON.stringify({ detail: "raw identifier not accepted" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Idempotency check: composite (tenantId, briefId, idempotencyKey)
    const compositeKey = `${tenantId}:${briefId}:${idempotencyKey}`;
    const existing = this.annotationIdempotency.get(compositeKey);
    if (existing) {
      if (existing.annotationText === annotation.trim()) {
        return new Response(JSON.stringify(existing.response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ detail: "idempotency key conflict" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    this.annotationCounter += 1;
    const nowIso = new Date().toISOString();
    const newAnnotation = {
      annotation_id: `ann_${this.annotationCounter.toString().padStart(4, "0")}`,
      operator_id: "token:test_operator_fingerprint",
      annotation: annotation.trim(),
      created_at: nowIso,
    };

    item.annotations.push(newAnnotation);
    item.queue_state = "annotated";
    item.updated_at = nowIso;

    this.annotationIdempotency.set(compositeKey, {
      annotationText: annotation.trim(),
      response: { ...item },
    });

    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
