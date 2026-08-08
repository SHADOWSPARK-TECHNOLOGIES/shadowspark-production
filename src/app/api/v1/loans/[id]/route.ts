import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { withIdempotency } from "@/middleware/idempotency";
import {
  closeLoanApplication,
  getLoanApplicationById,
  patchLoanApplication,
  validateLoanId,
  validatePatchLoanInput,
} from "@/lib/api/v1/loan-service";
import { ZodError } from "zod";

const METHODS = "GET, PATCH, DELETE, OPTIONS";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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
    const params = await context.params;
    const loanId = validateLoanId(params.id);
    const loan = await runWithTenantContext(authResult.context.tenantId, () =>
      getLoanApplicationById(loanId, authResult.context.tenantId)
    );

    if (!loan) {
      return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
    }

    return withCors(successResponse(loan), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        errorResponse(400, "INVALID_ID", error.issues[0]?.message ?? "Invalid id"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch loan"), request, METHODS);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
        const params = await context.params;
        const loanId = validateLoanId(params.id);
        const payload = await request.json();
        const input = validatePatchLoanInput(payload);

        const updated = await runWithTenantContext(authResult.context.tenantId, () =>
          patchLoanApplication(loanId, input, authResult.context.tenantId, authResult.context.userId)
        );

        return successResponse(updated);
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

    if (error instanceof Error && error.message === "LOAN_NOT_FOUND") {
        return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
    }
    if (error instanceof Error && error.message === "INVALID_STATUS_TRANSITION") {
      return withCors(
          errorResponse(400, "INVALID_STATUS_TRANSITION", "Invalid loan status transition"),
        request,
        METHODS
      );
    }
    if (error instanceof Error && error.message === "TENURE_REQUIRED_FOR_APPROVAL") {
      return withCors(
          errorResponse(400, "TENURE_REQUIRED", "tenureMonths is required before approving a loan"),
        request,
        METHODS
      );
    }
    if (error instanceof Error && error.message === "KYC_NOT_READY_FOR_APPROVAL") {
      return withCors(
        errorResponse(
          400,
          "KYC_NOT_READY_FOR_APPROVAL",
          "All KYC documents must be verified before approving a loan"
        ),
        request,
        METHODS
      );
    }
    if (error instanceof Error && error.message === "CREDIT_CHECK_REQUIRED_FOR_APPROVAL") {
      return withCors(
        errorResponse(
          400,
          "CREDIT_CHECK_REQUIRED_FOR_APPROVAL",
          "Credit check must pass before approving a loan"
        ),
        request,
        METHODS
      );
    }
    if (error instanceof Error && error.message === "ASSIGNED_OFFICER_NOT_FOUND") {
      return withCors(
          errorResponse(404, "NOT_FOUND", "Assigned officer not found"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to update loan"), request, METHODS);
  }
}

function isAdminRole(role: string): boolean {
  return role.toUpperCase() === "ADMIN";
}

export async function DELETE(request: Request, context: RouteContext) {
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

  if (!isAdminRole(authResult.context.role)) {
    return withCors(errorResponse(403, "FORBIDDEN", "Admin role is required"), request, METHODS);
  }

  try {
    return withCors(
      await withIdempotency(request, authResult.context.tenantId, async () => {
        const params = await context.params;
        const loanId = validateLoanId(params.id);
        const closedLoan = await runWithTenantContext(authResult.context.tenantId, () =>
          closeLoanApplication(loanId, authResult.context.tenantId, authResult.context.userId)
        );

        return successResponse(closedLoan);
      }),
      request,
      METHODS
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        errorResponse(400, "INVALID_ID", error.issues[0]?.message ?? "Invalid loan id"),
        request,
        METHODS
      );
    }

    if (error instanceof Error && error.message === "LOAN_NOT_FOUND") {
        return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to close loan"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
