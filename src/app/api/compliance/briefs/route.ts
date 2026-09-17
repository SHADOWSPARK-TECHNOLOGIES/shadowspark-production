export const dynamic = "force-dynamic";

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { resolveComplianceAuth } from "@/lib/ai-assist/server-auth";
import { readIdempotencyKey, resolveRequestId } from "@/lib/ai-assist/auth";
import { createComplianceBrief } from "@/lib/ai-assist/client";
import { aiAssistErrorResponse } from "@/lib/ai-assist/errors";

const METHODS = "POST, OPTIONS";

/**
 * POST /api/compliance/briefs → AI-ASSIST POST /v1/compliance-review-brief
 * Tenant comes from verified auth.context.tenantId only. Idempotency-Key is required
 * from the client and forwarded upstream (no Next-side Redis withIdempotency wrap).
 */
export async function POST(request: Request) {
  const auth = await resolveComplianceAuth(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) {
    return withCors(
      errorResponse(400, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required"),
      request,
      METHODS
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      errorResponse(400, "INVALID_JSON", "Request body must be valid JSON"),
      request,
      METHODS
    );
  }

  const exceptionId =
    body && typeof body === "object" && "exception_id" in body
      ? (body as { exception_id?: unknown }).exception_id
      : undefined;
  if (typeof exceptionId !== "string" || exceptionId.trim().length === 0) {
    return withCors(
      errorResponse(400, "INVALID_BODY", "exception_id is required"),
      request,
      METHODS
    );
  }

  try {
    const data = await createComplianceBrief({
      exceptionId: exceptionId.trim(),
      tenantId: auth.context.tenantId,
      requestId: resolveRequestId(request),
      idempotencyKey,
    });
    return withCors(successResponse({ success: true, data }), request, METHODS);
  } catch (error) {
    return withCors(aiAssistErrorResponse(error), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

