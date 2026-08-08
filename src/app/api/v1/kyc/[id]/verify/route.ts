import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { verifyKycDocument } from "@/lib/api/v1/kyc-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      const body = await request.json();
      const result = await verifyKycDocument(auth.context.tenantId, id, body.status, auth.context.userId, body.rejectionReason);
      if (!result) return errorResponse(404, "NOT_FOUND", "KYC document not found");
      return successResponse(result);
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
