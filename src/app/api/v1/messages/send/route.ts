import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { sendMessage } from "@/lib/api/v1/message-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      const { loanApplicationId, channel, content } = await request.json();
      if (!loanApplicationId || !channel || !content) return errorResponse(400, "INVALID_BODY", "loanApplicationId, channel and content are required");
      const msg = await sendMessage(auth.context.tenantId, loanApplicationId, channel, content, auth.context.userId);
      return successResponse(msg, 201);
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
