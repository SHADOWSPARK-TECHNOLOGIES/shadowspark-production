export const dynamic = 'force-dynamic';

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { queueKycOcrJob, getKycDocumentById } from "@/lib/api/v1/kyc-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  const doc = await getKycDocumentById(auth.context.tenantId, id);
  if (!doc) return withCors(errorResponse(404, "NOT_FOUND", "KYC document not found"), request, METHODS);

  const job = await queueKycOcrJob(auth.context.tenantId, id);
  return withCors(successResponse({ queued: true, jobId: job.id, kycDocumentId: id }), request, METHODS);
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
