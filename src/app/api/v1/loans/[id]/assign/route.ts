import { ZodError, z } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { withIdempotency } from "@/middleware/idempotency";
import {
  patchLoanApplication,
  validateLoanId,
} from "@/lib/api/v1/loan-service";

const METHODS = "POST, OPTIONS";

const assignLoanSchema = z.object({
  assignedOfficerId: z.string().trim().min(1),
});

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
        const loanId = validateLoanId(params.id);
        const payload = await request.json();
        const input = assignLoanSchema.parse(payload);

        const updatedLoan = await runWithTenantContext(authResult.context.tenantId, () =>
          patchLoanApplication(
            loanId,
            { assignedOfficerId: input.assignedOfficerId },
            authResult.context.tenantId,
            authResult.context.userId
          )
        );

        return successResponse(updatedLoan);
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

    if (error instanceof Error && error.message === "ASSIGNED_OFFICER_NOT_FOUND") {
      return withCors(errorResponse(404, "NOT_FOUND", "Assigned officer not found"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to assign loan"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
