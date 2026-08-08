import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { listMessages } from "@/lib/api/v1/message-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const loanApplicationId = new URL(request.url).searchParams.get("loanApplicationId") ?? "";
  try {
    const msgs = await listMessages(auth.context.tenantId, loanApplicationId);
    return withCors(successResponse(msgs), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch messages"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
