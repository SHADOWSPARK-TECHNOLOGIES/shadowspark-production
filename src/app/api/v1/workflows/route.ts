export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { createWorkflow, createWorkflowSchema, listWorkflows } from "@/lib/api/v1/workflow-service";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  try {
    const workflows = await listWorkflows(auth.context.tenantId);
    return withCors(successResponse(workflows), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to list workflows"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = createWorkflowSchema.parse(body);
        const workflow = await createWorkflow(auth.context.tenantId, input, auth.context.userId);
        return successResponse(workflow, 201);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to create workflow");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
