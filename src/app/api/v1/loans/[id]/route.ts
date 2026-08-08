import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { getLoanById } from "@/lib/api/v1/loan-service";

const METHODS = "GET, PATCH, OPTIONS";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);
  const { id } = await params;
  const loan = await getLoanById(authResult.context.tenantId, id);
  if (!loan) return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
  return withCors(successResponse(loan), request, METHODS);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);
  const { id } = await params;
  const loan = await getLoanById(authResult.context.tenantId, id);
  if (!loan) return withCors(errorResponse(404, "NOT_FOUND", "Loan not found"), request, METHODS);
  return withCors(successResponse(loan), request, METHODS);
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
