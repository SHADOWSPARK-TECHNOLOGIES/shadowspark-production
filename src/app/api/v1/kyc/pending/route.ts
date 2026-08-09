export const dynamic = 'force-dynamic';

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { getPendingKyc } from "@/lib/api/v1/kyc-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  try {
    const data = await getPendingKyc(auth.context.tenantId);
    return withCors(successResponse(data), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch pending KYC"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
