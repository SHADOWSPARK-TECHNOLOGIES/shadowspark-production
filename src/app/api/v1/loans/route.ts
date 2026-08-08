import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { withIdempotency } from "@/middleware/idempotency";
import {
  createLoanApplication,
  listLoanApplications,
  validateCreateLoanInput,
  validateLoansQuery,
} from "@/lib/api/v1/loan-service";
import { ZodError } from "zod";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(
      errorResponse(
        authResult.response.status,
        "UNAUTHORIZED",
        "Missing or invalid authorization header"
      ),
      request,
      METHODS
    );
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const query = validateLoansQuery(searchParams);
    const result = await runWithTenantContext(authResult.context.tenantId, () =>
      listLoanApplications(query, authResult.context.tenantId)
    );

    return withCors(
      successResponse(result),
      request,
      METHODS
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        errorResponse(400, "INVALID_QUERY", error.issues[0]?.message ?? "Invalid query"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch loans"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(
      errorResponse(
        authResult.response.status,
        "UNAUTHORIZED",
        "Missing or invalid authorization header"
      ),
      request,
      METHODS
    );
  }

  try {
    return withCors(
      await withIdempotency(request, authResult.context.tenantId, async () => {
        const payload = await request.json();
        const input = validateCreateLoanInput(payload);
        const loan = await runWithTenantContext(authResult.context.tenantId, () =>
          createLoanApplication(input, authResult.context.tenantId, authResult.context.userId)
        );

        return successResponse(loan, 201);
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

    if (error instanceof Error && error.message === "LOAN_BVN_ENCRYPTION_KEY is not configured") {
      return withCors(
        errorResponse(500, "ENCRYPTION_CONFIG_ERROR", "BVN encryption key is not configured"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to create loan"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
