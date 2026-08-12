import { ZodError } from "zod";

import { requireAuthContext } from "@/lib/api/auth-context";
import {
  getDashboardAnalytics,
  validateDashboardAnalyticsQuery,
} from "@/lib/api/v1/analytics-service";
import { envelopeErrorResponse, envelopeSuccessResponse } from "@/lib/api/http";
import { handleCorsPreflight, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

const METHODS = "GET, OPTIONS";

/** Returns tenant-scoped lending dashboard aggregates. */
export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) {
    return withCors(auth.response, request, METHODS);
  }

  try {
    const query = validateDashboardAnalyticsQuery(new URL(request.url).searchParams);
    const analytics = await getDashboardAnalytics(auth.context.tenantId, query);
    return withCors(envelopeSuccessResponse(analytics, {}), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        envelopeErrorResponse(
          400,
          "INVALID_QUERY",
          error.issues[0]?.message ?? "Invalid analytics query"
        ),
        request,
        METHODS
      );
    }

    return withCors(
      envelopeErrorResponse(500, "INTERNAL_ERROR", "Failed to load dashboard analytics"),
      request,
      METHODS
    );
  }
}

/** Handles the CORS preflight request for dashboard analytics. */
export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
