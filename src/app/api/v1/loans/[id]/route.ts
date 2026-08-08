import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { getLoanById } from "@/lib/api/v1/loan-service";
import { prisma } from "@/lib/prisma";

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
      const loan = await getLoanById(auth.context.tenantId, id);
      if (!loan) return errorResponse(404, "NOT_FOUND", "Loan not found");
      const body = await request.json();
      const updated = await prisma.loanApplication.update({
        where: { id },
        data: { status: body.status ?? loan.status },
        select: { id: true, tenantId: true, applicantName: true, applicantPhone: true, loanAmount: true, status: true, createdAt: true, updatedAt: true },
      });
      return successResponse({ ...updated, loanAmount: Number(updated.loanAmount) });
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
