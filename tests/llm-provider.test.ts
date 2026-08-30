import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => ({ provider: "google" }))),
}));

vi.mock("ai", () => ({ generateText: mocks.generateText }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: mocks.createGoogleGenerativeAI }));

import { generateAssistantReply, getLlmProviderStatus, isTwilioConfigured } from "@/lib/llm";

describe("LLM provider selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
    mocks.generateText.mockResolvedValue({ text: "Studio reply" });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses AI Studio with a 10-second timeout", async () => {
    process.env.GEMINI_API_KEY = "studio-key";

    await expect(generateAssistantReply("hello")).resolves.toEqual({
      provider: "studio",
      text: "Studio reply",
    });
    expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({ timeout: 10_000 }));
  });

  it("falls back to OpenRouter only when configured", async () => {
    process.env.GEMINI_API_KEY = "studio-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    mocks.generateText.mockRejectedValueOnce(new Error("Studio down"));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ choices: [{ message: { content: "Fallback reply" } }] }),
      { status: 200 },
    ));

    await expect(generateAssistantReply("hello")).resolves.toEqual({
      provider: "openrouter",
      text: "Fallback reply",
    });
  });

  it("uses a deterministic script without provider keys", async () => {
    const result = await generateAssistantReply("hello");

    expect(result.provider).toBe("script");
    expect(result.text).toContain("ShadowSpark");
  });

  it("reports provider and Twilio configuration status", () => {
    process.env.GEMINI_API_KEY = "studio-key";
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+14155552671";

    expect(getLlmProviderStatus()).toBe("studio");
    expect(isTwilioConfigured()).toBe(true);
  });
});
