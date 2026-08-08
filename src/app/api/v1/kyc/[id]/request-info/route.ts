export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { requestInfoSchema, requestKycInfo } from "@/lib/api/v1/kyc-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = requestInfoSchema.parse(body);
        const result = await requestKycInfo(auth.context.tenantId, id, input, auth.context.userId);
        if (!result) return errorResponse(404, "NOT_FOUND", "KYC document not found");
        return successResponse(result);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to request KYC info");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
