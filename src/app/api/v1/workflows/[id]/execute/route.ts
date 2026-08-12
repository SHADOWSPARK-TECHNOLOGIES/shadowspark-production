export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { envelopeErrorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { executeWorkflow, executeWorkflowSchema } from "@/lib/api/v1/workflow-service";

const METHODS = "POST, OPTIONS";

/** Executes an active workflow in the authenticated tenant idempotently. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = executeWorkflowSchema.parse(body);
        const result = await executeWorkflow(auth.context.tenantId, id, input, auth.context.userId);
        if (!result) return envelopeErrorResponse(404, "NOT_FOUND", "Workflow not found");
        return successResponse({ success: true, data: result });
      } catch (error) {
        if (error instanceof ZodError) {
          return envelopeErrorResponse(
            400,
            "INVALID_BODY",
            error.issues[0]?.message ?? "Invalid request body"
          );
        }
        if (error instanceof SyntaxError) {
          return envelopeErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
        }
        return envelopeErrorResponse(500, "INTERNAL_ERROR", "Failed to execute workflow");
      }
    }),
    request,
    METHODS,
  );
}

/** Handles CORS preflight for workflow execution. */
export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
