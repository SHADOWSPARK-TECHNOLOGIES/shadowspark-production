export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { getLoanById, updateLoan, updateLoanSchema } from "@/lib/api/v1/loan-service";

const METHODS = "GET, PATCH, OPTIONS";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;
  const loan = await getLoanById(auth.context.tenantId, id);
  if (!loan) return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
  return withCors(successResponse(loan), request, METHODS);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = updateLoanSchema.parse(body);
        const updated = await updateLoan(auth.context.tenantId, id, input, auth.context.userId);
        if (!updated) return errorResponse(404, "NOT_FOUND", "Loan not found");
        return successResponse(updated);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        if (error instanceof Error && error.message.startsWith("INVALID_")) {
          return errorResponse(409, error.message.split(":")[0]!, error.message);
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to update loan");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
