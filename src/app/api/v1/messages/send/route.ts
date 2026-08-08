import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { withIdempotency } from "@/middleware/idempotency";
import { sendMessage, validateSendMessageInput } from "@/lib/api/v1/message-service";
import { ZodError } from "zod";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    return withCors(
      await withIdempotency(request, authResult.context.tenantId, async () => {
        const payload = await request.json();
        const input = validateSendMessageInput(payload);
        const result = await runWithTenantContext(authResult.context.tenantId, () =>
          sendMessage(authResult.context.tenantId, authResult.context.userId, input)
        );

        return successResponse(result, 202);
      }),
      request,
      METHODS
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"), request, METHODS);
    }

    if (error instanceof Error && error.message === "MESSAGE_TEMPLATE_NOT_FOUND") {
      return withCors(
        errorResponse(404, "NOT_FOUND", "Message template not found"),
        request,
        METHODS
      );
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to queue message"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
