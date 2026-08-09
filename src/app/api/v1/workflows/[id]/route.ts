export const dynamic = 'force-dynamic';

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { getWorkflow } from "@/lib/api/v1/workflow-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;
  const workflow = await getWorkflow(auth.context.tenantId, id);
  if (!workflow) return withCors(errorResponse(404, "NOT_FOUND", "Workflow not found"), request, METHODS);
  return withCors(successResponse(workflow), request, METHODS);
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
