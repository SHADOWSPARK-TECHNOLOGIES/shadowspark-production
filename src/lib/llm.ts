import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export type LlmProvider = "studio" | "openrouter" | "script";

const STUDIO_MODEL = "gemini-3.1-flash-lite";
const OPENROUTER_MODEL = "google/gemini-3.1-flash-lite";
const TIMEOUT_MS = 10_000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SCRIPT_REPLY = "Thanks for reaching out to ShadowSpark. A team member will follow up shortly.";

function configured(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getLlmProviderStatus(): LlmProvider {
  if (configured("GEMINI_API_KEY")) return "studio";
  if (configured("OPENROUTER_API_KEY")) return "openrouter";
  return "script";
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    configured("TWILIO_ACCOUNT_SID") &&
      configured("TWILIO_AUTH_TOKEN") &&
      configured("TWILIO_WHATSAPP_FROM"),
  );
}

async function generateWithStudio(prompt: string): Promise<string> {
  const apiKey = configured("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const google = createGoogleGenerativeAI({ apiKey });
  const result = await generateText({
    model: google(STUDIO_MODEL),
    prompt,
    timeout: TIMEOUT_MS,
  });
  const text = result.text.trim();
  if (!text) throw new Error("Google AI Studio returned an empty response");
  return text;
}

async function generateWithOpenRouter(prompt: string): Promise<string> {
  const apiKey = configured("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenRouter returned an empty response");
  }
  return text.trim();
}

export async function generateAssistantReply(
  prompt: string,
): Promise<{ provider: LlmProvider; text: string }> {
  if (configured("GEMINI_API_KEY")) {
    try {
      return { provider: "studio", text: await generateWithStudio(prompt) };
    } catch (error) {
      console.warn("[llm] Google AI Studio unavailable; trying configured fallback", error);
    }
  }

  if (configured("OPENROUTER_API_KEY")) {
    try {
      return { provider: "openrouter", text: await generateWithOpenRouter(prompt) };
    } catch (error) {
      console.warn("[llm] OpenRouter unavailable; using deterministic fallback", error);
    }
  }

  return { provider: "script", text: SCRIPT_REPLY };
}
