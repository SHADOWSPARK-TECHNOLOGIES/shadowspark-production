import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { envelopeErrorResponse, errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { sendMessage, validateSendMessageInput } from "@/lib/api/v1/message-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    const input = validateSendMessageInput(await request.json());
    const msg = await sendMessage(authResult.context.tenantId, authResult.context.userId, input);
    return withCors(successResponse(msg, 201), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        envelopeErrorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"),
        request,
        METHODS
      );
    }
    if (error instanceof SyntaxError) {
      return withCors(
        envelopeErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON"),
        request,
        METHODS
      );
    }
    if (error instanceof Error && error.message === "LOAN_NOT_FOUND") {
      return withCors(envelopeErrorResponse(404, "LOAN_NOT_FOUND", "Loan application not found"), request, METHODS);
    }
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to send message"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
