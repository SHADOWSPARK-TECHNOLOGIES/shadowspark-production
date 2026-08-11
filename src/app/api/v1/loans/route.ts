import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/lib/idempotency";
import {
  createLoanApplication,
  listLoans,
  validateCreateLoanInput,
  validateLoansQuery,
} from "@/lib/api/v1/loan-service";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    const url = new URL(request.url);
    const query = validateLoansQuery(url.searchParams);
    const result = await listLoans(authResult.context.tenantId, query.page, query.pageSize);
    return withCors(successResponse(result), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch loans"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    return await withIdempotency(request, authResult.context.tenantId, async () => {
      const rawInput = await request.json();
      const input = validateCreateLoanInput(rawInput);
      const created = await createLoanApplication(
        authResult.context.tenantId,
        input,
        authResult.context.userId
      );
      return withCors(successResponse(created, 201), request, METHODS);
    });
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to create loan"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
