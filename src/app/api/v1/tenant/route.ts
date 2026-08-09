import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getTenantProfile } from "@/lib/api/v1/tenant-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const tenant = await runWithTenantContext(authResult.context.tenantId, () =>
      getTenantProfile(authResult.context.tenantId)
    );

    return withCors(successResponse(tenant), request, METHODS);
  } catch (error) {
    if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
      return withCors(errorResponse(404, "NOT_FOUND", "Tenant not found"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch tenant"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

