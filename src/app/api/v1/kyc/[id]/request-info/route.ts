import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { withIdempotency } from "@/middleware/idempotency";
import {
  requestMoreKycInfo,
  validateKycId,
  validateRequestKycInfoInput,
} from "@/lib/api/v1/kyc-service";

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
    return withCors(
      await withIdempotency(request, authResult.context.tenantId, async () => {
        const params = await context.params;
        const kycId = validateKycId(params.id);
        const payload = await request.json();
        const input = validateRequestKycInfoInput(payload);

        const result = await runWithTenantContext(authResult.context.tenantId, () =>
          requestMoreKycInfo({
            kycId,
            tenantId: authResult.context.tenantId,
            actorUserId: authResult.context.userId,
            input,
          })
        );

        return successResponse(result);
      }),
      request,
      METHODS
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"),
        request,
        METHODS
      );
    }

    if (error instanceof Error && error.message === "KYC_NOT_FOUND") {
      return withCors(errorResponse(404, "NOT_FOUND", "KYC document not found"), request, METHODS);
    }

    return withCors(
      errorResponse(500, "INTERNAL_ERROR", "Failed to request additional KYC information"),
      request,
      METHODS
    );
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
