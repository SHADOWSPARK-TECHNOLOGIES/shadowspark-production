export const dynamic = "force-dynamic";

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { resolveComplianceAuth } from "@/lib/ai-assist/server-auth";
import { resolveRequestId } from "@/lib/ai-assist/auth";
import { getComplianceReview } from "@/lib/ai-assist/client";
import { aiAssistErrorResponse } from "@/lib/ai-assist/errors";

const METHODS = "GET, OPTIONS";

/**
 * GET /api/compliance/reviews/[briefId] → AI-ASSIST GET /v1/review-queue/{brief_id}
 * Cross-tenant misses are indistinguishable 404s from upstream.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ briefId: string }> }
) {
  const auth = await resolveComplianceAuth(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  const { briefId } = await context.params;
  if (!briefId?.trim()) {
    return withCors(errorResponse(400, "INVALID_BODY", "briefId is required"), request, METHODS);
  }

  try {
    const data = await getComplianceReview({
      briefId: briefId.trim(),
      tenantId: auth.context.tenantId,
      requestId: resolveRequestId(request),
    });
    return withCors(successResponse({ success: true, data }), request, METHODS);
  } catch (error) {
    return withCors(aiAssistErrorResponse(error), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
