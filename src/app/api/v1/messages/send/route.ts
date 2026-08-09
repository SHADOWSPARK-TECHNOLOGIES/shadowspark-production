import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { sendMessage } from "@/lib/api/v1/message-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);

  try {
    const { to, channel, body } = await request.json();
    const msg = await sendMessage(authResult.context.tenantId, to, channel, body);
    return withCors(successResponse(msg, 201), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to send message"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
