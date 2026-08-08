import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { listPendingKycDocuments, validatePendingKycQuery } from "@/lib/api/v1/kyc-service";
import { ZodError } from "zod";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const query = validatePendingKycQuery(new URL(request.url).searchParams);
    const data = await runWithTenantContext(authResult.context.tenantId, () =>
      listPendingKycDocuments(authResult.context.tenantId, query)
    );
    return withCors(successResponse(data), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        errorResponse(400, "INVALID_QUERY", error.issues[0]?.message ?? "Invalid query"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch pending KYC"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
