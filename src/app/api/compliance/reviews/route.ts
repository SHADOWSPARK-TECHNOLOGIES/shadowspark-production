export const dynamic = "force-dynamic";

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { resolveComplianceAuth } from "@/lib/ai-assist/server-auth";
import { resolveRequestId } from "@/lib/ai-assist/auth";
import { listComplianceReviews } from "@/lib/ai-assist/client";
import { aiAssistErrorResponse } from "@/lib/ai-assist/errors";

const METHODS = "GET, OPTIONS";

/**
 * GET /api/compliance/reviews → AI-ASSIST GET /v1/review-queue
 * Retrieves paginated review queue entries for the authenticated tenant.
 * Tenant is strictly derived from verified authentication context.
 */
export async function GET(request: Request) {
  const auth = await resolveComplianceAuth(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  const { searchParams } = new URL(request.url);

  let limit: number | undefined = undefined;
  const limitParam = searchParams.get("limit");
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      return withCors(
        errorResponse(400, "INVALID_QUERY", "limit must be an integer between 1 and 100"),
        request,
        METHODS
      );
    }
    limit = parsed;
  }

  let offset: number | undefined = undefined;
  const offsetParam = searchParams.get("offset");
  if (offsetParam !== null) {
    const parsed = Number(offsetParam);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return withCors(
        errorResponse(400, "INVALID_QUERY", "offset must be a non-negative integer"),
        request,
        METHODS
      );
    }
    offset = parsed;
  }

  let state: "pending_review" | "annotated" | undefined = undefined;
  const stateParam = searchParams.get("state");
  if (stateParam !== null) {
    if (stateParam !== "pending_review" && stateParam !== "annotated") {
      return withCors(
        errorResponse(400, "INVALID_QUERY", "state must be 'pending_review' or 'annotated'"),
        request,
        METHODS
      );
    }
    state = stateParam;
  }

  try {
    const data = await listComplianceReviews({
      limit,
      offset,
      state,
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
