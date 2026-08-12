import { ZodError } from "zod";

import { requireAuthContext } from "@/lib/api/auth-context";
import { envelopeErrorResponse, errorResponse, successResponse } from "@/lib/api/http";
import {
  createLoanApplication,
  listLoans,
  validateCreateLoanInput,
  validateLoansQuery,
} from "@/lib/api/v1/loan-service";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { withIdempotency } from "@/lib/idempotency";

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

/** Creates a tenant-scoped loan application with idempotent replay semantics. */
export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    const response = await withIdempotency(request, authResult.context.tenantId, async () => {
      const rawInput = await request.json();
      const input = validateCreateLoanInput(rawInput);
      const created = await createLoanApplication(
        authResult.context.tenantId,
        input,
        authResult.context.userId
      );

      return successResponse(
        {
          success: true,
          data: {
            id: created.id,
            status: created.status,
          },
        },
        201
      );
    });

    return withCors(response, request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        envelopeErrorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"),
        request,
        METHODS
      );
    }

    if (error instanceof SyntaxError) {
      return withCors(
        envelopeErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON"),
        request,
        METHODS
      );
    }

    return withCors(
      envelopeErrorResponse(500, "INTERNAL_ERROR", "Failed to create loan"),
      request,
      METHODS
    );
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
