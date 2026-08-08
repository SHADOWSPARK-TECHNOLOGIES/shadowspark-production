import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { verifyKycDocument } from "@/lib/api/v1/kyc-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    const { id } = await params;
    const { status, rejectionReason } = await request.json();
    const result = await verifyKycDocument(authResult.context.tenantId, id, status, rejectionReason);
    if (!result) return withCors(errorResponse(404, "NOT_FOUND", "KYC document not found"), request, METHODS);
    return withCors(successResponse(result), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to verify KYC document"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
