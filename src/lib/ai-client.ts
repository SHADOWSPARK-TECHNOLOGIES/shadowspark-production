import { randomUUID } from "crypto";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL?.replace(/\/$/, "") ?? "";
const AI_SERVICE_SECRET_KEY = process.env.AI_SERVICE_SECRET_KEY ?? "";

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  loan_context?: string;
  stream?: boolean;
}

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

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

export async function chatWithAi(payload: AiChatRequest): Promise<AiChatResponse> {
  if (!AI_SERVICE_URL) {
    throw new AiClientError("AI_SERVICE_URL is not configured");
  }
  if (!AI_SERVICE_SECRET_KEY) {
    throw new AiClientError("AI_SERVICE_SECRET_KEY is not configured");
  }

  const requestId = randomUUID();
  const response = await fetch(`${AI_SERVICE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_SERVICE_SECRET_KEY,
      "X-Request-ID": requestId,
    },
    body: JSON.stringify({ ...payload, stream: payload.stream ?? false }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown AI service error");
    throw new AiClientError(
      `AI service returned ${response.status}: ${text}`,
      response.status,
    );
  }

  return response.json() as Promise<AiChatResponse>;
}
