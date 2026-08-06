/**
 * WhatsApp conversational bot — Anthropic SDK
 *
 * Generates a brand-aligned reply to an incoming WhatsApp message using Claude.
 * Called from the Meta Cloud API webhook handler.
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY — Anthropic API key
 *
 * The system prompt is marked with cache_control so the stable prefix is reused
 * across requests (prompt caching is a prefix match; see Anthropic docs). Note:
 * caching only takes effect once the cached prefix exceeds the model minimum
 * (~1024 tokens for Opus), so it is a no-op for very short prompts but harmless.
 */

import Anthropic from "@anthropic-ai/sdk";

/** Claude model used for WhatsApp replies. */
const MODEL = "claude-opus-4-8";

/** Cap reply length — WhatsApp messages should be short. */
const MAX_TOKENS = 600;

/**
 * Brand + behaviour instructions for the bot. Kept stable (no per-request
 * interpolation) so it caches cleanly as the prompt prefix.
 */
const SYSTEM_PROMPT = `You are the customer assistant for ShadowSpark Technologies, a Nigeria-first software company founded by Stephen Okoronkwo and based in Owerri, Imo State. ShadowSpark builds AI-powered WhatsApp chatbots, fintech platforms, and cloud-native infrastructure for Nigerian businesses.

You reply to people who message ShadowSpark on WhatsApp.

Voice and rules:
- Warm, professional, trust-first. Nigerian business context.
- Keep replies short — 1 to 3 sentences. This is WhatsApp, not email.
- Plain text only. No markdown, no asterisks, no headings. A single emoji is fine.
- Never invent prices, timelines, or commitments. If you don't know, say a team member will follow up.
- For payment questions: tell them to check their email for the secure payment link, and offer to connect them with the team.
- For support: collect what they need and assure them the team responds within 24 hours (support@shadowspark.tech).
- If a request is clearly outside ShadowSpark's services, politely redirect.
- Do not ask for passwords, card numbers, OTPs, or other secrets.`;

let client: Anthropic | null = null;

/** Lazily construct the client so a missing key fails per-request, not at import. */
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Generates a conversational reply to an incoming WhatsApp text message.
 *
 * Stateless single-turn: the webhook does not persist conversation history yet,
 * so each message is answered on its own. Pass prior turns via `history` once a
 * conversation store is added.
 */
export async function getBotReply(
  userText: string,
  history: Anthropic.MessageParam[] = [],
): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [...history, { role: "user", content: userText }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return text;
}
