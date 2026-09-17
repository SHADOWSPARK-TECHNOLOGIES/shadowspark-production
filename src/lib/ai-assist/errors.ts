import { errorResponse } from "@/lib/api/http";

export type AiAssistErrorCode =
  | "SERVICE_UNAVAILABLE"
  | "NEEDS_ENV"
  | "GATEWAY_TIMEOUT"
  | "UPSTREAM_AUTH"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "BAD_GATEWAY"
  | "INVALID_BODY"
  | "INVALID_JSON"
  | "MISSING_IDEMPOTENCY_KEY";

/** Typed adapter error. Messages must never include the service token. */
export class AiAssistError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: AiAssistErrorCode,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AiAssistError";
  }
}

export function isTimeoutLike(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "TimeoutError" || name === "AbortError";
}

export function mapUpstreamStatus(status: number): { status: number; code: AiAssistErrorCode } {
  if (status === 400) return { status: 400, code: "INVALID_BODY" };
  if (status === 401 || status === 403) return { status: 502, code: "UPSTREAM_AUTH" };
  if (status === 404) return { status: 404, code: "NOT_FOUND" };
  if (status === 409) return { status: 409, code: "CONFLICT" };
  if (status === 422) return { status: 422, code: "UNPROCESSABLE_ENTITY" };
  if (status === 429) return { status: 429, code: "RATE_LIMITED" };
  if (status >= 500) return { status: 502, code: "BAD_GATEWAY" };
  return { status: 502, code: "BAD_GATEWAY" };
}

const SAFE_MESSAGES: Record<AiAssistErrorCode, string> = {
  SERVICE_UNAVAILABLE: "AI-ASSIST is not configured",
  NEEDS_ENV: "AI-ASSIST is not configured",
  GATEWAY_TIMEOUT: "AI-ASSIST request timed out",
  UPSTREAM_AUTH: "AI-ASSIST authentication failed",
  NOT_FOUND: "Review not found",
  CONFLICT: "Idempotency conflict",
  UNPROCESSABLE_ENTITY: "AI-ASSIST rejected the request",
  RATE_LIMITED: "AI-ASSIST rate limited the request",
  BAD_GATEWAY: "AI-ASSIST request failed",
  INVALID_BODY: "Invalid request body",
  INVALID_JSON: "Request body must be valid JSON",
  MISSING_IDEMPOTENCY_KEY: "Idempotency-Key header is required",
};

export function messageForCode(code: AiAssistErrorCode): string {
  return SAFE_MESSAGES[code];
}

export function aiAssistErrorResponse(error: unknown) {
  if (error instanceof AiAssistError) {
    return errorResponse(error.status, error.code, error.message);
  }
  return errorResponse(502, "BAD_GATEWAY", SAFE_MESSAGES.BAD_GATEWAY);
}
