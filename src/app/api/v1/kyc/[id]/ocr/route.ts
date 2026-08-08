import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { queueKycOcr, validateKycId } from "@/lib/api/v1/kyc-service";

const METHODS = "POST, OPTIONS";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const params = await context.params;
    const kycId = validateKycId(params.id);
    const job = await runWithTenantContext(authResult.context.tenantId, () =>
      queueKycOcr(kycId, authResult.context.tenantId)
    );

    return withCors(successResponse({ jobId: job.id }, 202), request, METHODS);
  } catch (error) {
    if (error instanceof Error && error.message === "KYC_NOT_FOUND") {
      return withCors(errorResponse(404, "NOT_FOUND", "KYC document not found"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to queue OCR"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
