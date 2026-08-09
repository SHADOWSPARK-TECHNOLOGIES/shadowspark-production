export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { createLoan, createLoanSchema, listLoans } from "@/lib/api/v1/loan-service";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
    const result = await listLoans(auth.context.tenantId, page, pageSize);
    return withCors(successResponse(result), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch loans"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = createLoanSchema.parse(body);
        const loan = await createLoan(auth.context.tenantId, input, auth.context.userId);
        return successResponse(loan, 201);
      } catch (error) {
        if (error instanceof ZodError) return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        return errorResponse(500, "INTERNAL_ERROR", "Failed to create loan");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
