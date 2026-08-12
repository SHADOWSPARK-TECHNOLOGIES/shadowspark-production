import { ZodError, z } from "zod";

import { requireAuthContext } from "@/lib/api/auth-context";
import { envelopeErrorResponse, envelopeSuccessResponse } from "@/lib/api/http";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { AiClientError, chatWithAi } from "@/lib/ai-client";

export const dynamic = "force-dynamic";

const METHODS = "POST, OPTIONS";

const messageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().trim().min(1).max(20_000),
  })
  .strict();

const chatSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(20),
    loan_context: z.string().trim().max(50_000).optional(),
    stream: z.boolean().optional(),
  })
  .strict();

/** Generates a tenant-authenticated lending chat response. */
export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) {
    return withCors(auth.response, request, METHODS);
  }

  try {
    const body = await request.json();
    const payload = chatSchema.parse(body);

    const data = await chatWithAi({
      messages: payload.messages,
      loan_context: payload.loan_context,
      stream: payload.stream ?? false,
    });

    return withCors(envelopeSuccessResponse(data, {}), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(
        envelopeErrorResponse(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", ")),
        request,
        METHODS,
      );
    }

    if (error instanceof SyntaxError) {
      return withCors(
        envelopeErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON"),
        request,
        METHODS,
      );
    }

    if (error instanceof AiClientError) {
      return withCors(
        envelopeErrorResponse(error.statusCode ?? 502, error.code, error.message),
        request,
        METHODS,
      );
    }

    return withCors(
      envelopeErrorResponse(500, "INTERNAL_ERROR", "Failed to process AI chat request"),
      request,
      METHODS,
    );
  }
}

/** Handles CORS preflight for lending chat. */
export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}
