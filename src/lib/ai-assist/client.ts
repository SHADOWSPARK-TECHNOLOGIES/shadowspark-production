import { buildAiAssistHeaders, getAiAssistConfig } from "./auth";
import { AiAssistError, isTimeoutLike, mapUpstreamStatus, messageForCode } from "./errors";
import type {
  AddAnnotationParams,
  BriefResponse,
  CreateBriefParams,
  GetReviewParams,
  ListReviewsParams,
  ReviewQueueListResponse,
  ReviewQueueResponse,
} from "./types";

interface FetchOptions {
  path: string;
  method: "GET" | "POST";
  tenantId?: string;
  requestId?: string;
  idempotencyKey?: string;
  body?: unknown;
}

function mapTransportError(error: unknown): AiAssistError {
  if (isTimeoutLike(error)) {
    return new AiAssistError(messageForCode("GATEWAY_TIMEOUT"), 504, "GATEWAY_TIMEOUT", {
      cause: error,
    });
  }
  return new AiAssistError(messageForCode("BAD_GATEWAY"), 502, "BAD_GATEWAY", { cause: error });
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function aiAssistFetch<T>(options: FetchOptions): Promise<T> {
  const config = getAiAssistConfig();
  const url = `${config.apiUrl}${options.path}`;
  const headers = buildAiAssistHeaders({
    token: config.apiToken,
    tenantId: options.tenantId,
    requestId: options.requestId,
    idempotencyKey: options.idempotencyKey,
    json: options.method === "POST",
  });

  const doFetch = () =>
    fetch(url, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

  let response: Response;
  try {
    response = await doFetch();
  } catch (error) {
    if (options.method === "GET") {
      try {
        response = await doFetch();
      } catch (retryError) {
        throw mapTransportError(retryError);
      }
    } else {
      throw mapTransportError(error);
    }
  }

  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    throw new AiAssistError(messageForCode(mapped.code), mapped.status, mapped.code);
  }

  const payload = await parseJson(response);
  if (payload === null || typeof payload !== "object") {
    throw new AiAssistError(messageForCode("BAD_GATEWAY"), 502, "BAD_GATEWAY");
  }

  return payload as T;
}

/** POST /v1/compliance-review-brief — no POST retry. Body omits tenant_id; tenant is header-only. */
export function createComplianceBrief(params: CreateBriefParams): Promise<BriefResponse> {
  return aiAssistFetch<BriefResponse>({
    path: "/v1/compliance-review-brief",
    method: "POST",
    tenantId: params.tenantId,
    requestId: params.requestId,
    idempotencyKey: params.idempotencyKey,
    body: { exception_id: params.exceptionId },
  });
}

/** GET /v1/review-queue — optional single retry on transport failure only. */
export function listComplianceReviews(params: ListReviewsParams = {}): Promise<ReviewQueueListResponse> {
  const searchParams = new URLSearchParams();
  if (typeof params.limit === "number") searchParams.set("limit", String(params.limit));
  if (typeof params.offset === "number") searchParams.set("offset", String(params.offset));
  if (params.state) searchParams.set("state", params.state);
  const qs = searchParams.toString();
  const path = qs ? `/v1/review-queue?${qs}` : "/v1/review-queue";

  return aiAssistFetch<ReviewQueueListResponse>({
    path,
    method: "GET",
    tenantId: params.tenantId,
    requestId: params.requestId,
  });
}

/** GET /v1/review-queue/{brief_id} — optional single retry on transport failure only. */
export function getComplianceReview(params: GetReviewParams): Promise<ReviewQueueResponse> {
  return aiAssistFetch<ReviewQueueResponse>({
    path: `/v1/review-queue/${encodeURIComponent(params.briefId)}`,
    method: "GET",
    tenantId: params.tenantId,
    requestId: params.requestId,
  });
}

/** POST /v1/review-queue/{brief_id}/annotations — Idempotency-Key required and forwarded. */
export function addComplianceAnnotation(params: AddAnnotationParams): Promise<ReviewQueueResponse> {
  return aiAssistFetch<ReviewQueueResponse>({
    path: `/v1/review-queue/${encodeURIComponent(params.briefId)}/annotations`,
    method: "POST",
    tenantId: params.tenantId,
    requestId: params.requestId,
    idempotencyKey: params.idempotencyKey,
    body: { annotation: params.annotation },
  });
}
