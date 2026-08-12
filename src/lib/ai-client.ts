import { randomUUID } from "crypto";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const AI_SERVICE_TIMEOUT_MS = 5_000;
const GEMINI_TIMEOUT_MS = 30_000;
const GEMINI_MAX_OUTPUT_TOKENS = 2_048;

/** A single role-tagged message accepted by the lending chat endpoint. */
export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Provider-neutral input for a lending chat request. */
export interface AiChatRequest {
  messages: AiChatMessage[];
  loan_context?: string;
  stream?: boolean;
}

/** Provider response normalized for the public lending API. */
export interface AiChatResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  created_at: number;
}

const aiChatResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  model: z.string(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
  created_at: z.number().int().nonnegative(),
});

export type AiClientErrorCode = "AI_SERVICE_ERROR" | "NEEDS_ENV";

/** Error raised when neither the AI service nor its Gemini fallback can respond. */
export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code: AiClientErrorCode = "AI_SERVICE_ERROR",
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AiClientError";
  }
}

function getAiServiceConfig(): { url: string; secret: string } | null {
  const url = process.env.AI_SERVICE_URL?.replace(/\/$/, "") ?? "";
  const secret = process.env.AI_SERVICE_SECRET_KEY ?? "";
  if (!url || !secret) {
    return null;
  }

  return { url, secret };
}

async function requestAiService(
  payload: AiChatRequest,
  config: { url: string; secret: string }
): Promise<AiChatResponse> {
  const response = await fetch(`${config.url}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": config.secret,
      "X-Request-ID": randomUUID(),
    },
    body: JSON.stringify({ ...payload, stream: payload.stream ?? false }),
    signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new AiClientError(`AI service returned ${response.status}`, response.status);
  }

  try {
    return aiChatResponseSchema.parse(await response.json());
  } catch (error) {
    throw new AiClientError("AI service returned an invalid response", 502, "AI_SERVICE_ERROR", {
      cause: error,
    });
  }
}

async function requestGeminiDirect(
  payload: AiChatRequest,
  serviceError?: Error
): Promise<AiChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    throw new AiClientError("NEEDS_ENV", 503, "NEEDS_ENV", {
      cause: serviceError,
    });
  }

  const modelId = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const google = createGoogleGenerativeAI({ apiKey });
  const messages: AiChatMessage[] = [
    ...(payload.loan_context
      ? [{ role: "system" as const, content: `Loan context:\n${payload.loan_context}` }]
      : []),
    ...payload.messages,
  ];

  try {
    const result = await generateText({
      model: google(modelId),
      messages,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      timeout: GEMINI_TIMEOUT_MS,
    });

    return {
      id: randomUUID(),
      content: result.text,
      model: modelId,
      usage: {
        input_tokens: result.usage.inputTokens ?? 0,
        output_tokens: result.usage.outputTokens ?? 0,
      },
      created_at: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    throw new AiClientError("Gemini fallback failed", 502, "AI_SERVICE_ERROR", {
      cause: error,
    });
  }
}

/**
 * Sends an AI chat request through the configured service, with a direct
 * Gemini fallback when the service is absent or unreachable.
 *
 * @param payload - Validated chat messages and optional loan context.
 * @returns The provider response normalized to the AI service contract.
 * @throws {AiClientError} `NEEDS_ENV` when no usable provider is configured.
 */
export async function chatWithAi(payload: AiChatRequest): Promise<AiChatResponse> {
  const serviceConfig = getAiServiceConfig();
  if (serviceConfig === null) {
    return requestGeminiDirect(payload);
  }

  try {
    return await requestAiService(payload, serviceConfig);
  } catch (error) {
    if (error instanceof AiClientError) {
      throw error;
    }

    const serviceError = error instanceof Error ? error : new Error("AI service is unreachable");
    return requestGeminiDirect(payload, serviceError);
  }
}
