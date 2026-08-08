import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getKycDocumentById, validateKycId } from "@/lib/api/v1/kyc-service";

const METHODS = "GET, OPTIONS";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const params = await context.params;
    const kycId = validateKycId(params.id);
    const document = await runWithTenantContext(authResult.context.tenantId, () =>
      getKycDocumentById(kycId, authResult.context.tenantId)
    );

    if (!document) {
      return withCors(errorResponse(404, "NOT_FOUND", "KYC document not found"), request, METHODS);
    }

    return withCors(successResponse(document), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch KYC document"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
