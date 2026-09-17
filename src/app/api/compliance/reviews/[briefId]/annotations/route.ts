export const dynamic = "force-dynamic";

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { resolveComplianceAuth } from "@/lib/ai-assist/server-auth";
import { readIdempotencyKey, resolveRequestId } from "@/lib/ai-assist/auth";
import { addComplianceAnnotation } from "@/lib/ai-assist/client";
import { aiAssistErrorResponse } from "@/lib/ai-assist/errors";

const METHODS = "POST, OPTIONS";

/**
 * POST /api/compliance/reviews/[briefId]/annotations
 * → AI-ASSIST POST /v1/review-queue/{brief_id}/annotations
 * Requires Idempotency-Key from the client and forwards it upstream.
 * Does not wrap with Redis withIdempotency.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ briefId: string }> }
) {
  const auth = await resolveComplianceAuth(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  const { briefId } = await context.params;
  if (!briefId?.trim()) {
    return withCors(errorResponse(400, "INVALID_BODY", "briefId is required"), request, METHODS);
  }

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

  if (!body || typeof body !== "object" || !("annotation" in body)) {
    return withCors(
      errorResponse(400, "INVALID_BODY", "annotation is required"),
      request,
      METHODS
    );
  }

  const rawAnnotation = (body as { annotation?: unknown }).annotation;
  if (typeof rawAnnotation !== "string" || rawAnnotation.trim().length === 0) {
    return withCors(
      errorResponse(400, "INVALID_BODY", "annotation is required"),
      request,
      METHODS
    );
  }

  try {
    const data = await addComplianceAnnotation({
      briefId: briefId.trim(),
      annotation: rawAnnotation.trim(),
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
