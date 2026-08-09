export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { sendMessage, sendMessageSchema } from "@/lib/api/v1/message-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = sendMessageSchema.parse(body);
        const msg = await sendMessage(auth.context.tenantId, input, auth.context.userId);
        return successResponse(msg, 201);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to send message");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
