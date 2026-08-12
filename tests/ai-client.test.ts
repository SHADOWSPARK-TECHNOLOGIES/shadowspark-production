import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAiSdk = vi.hoisted(() => ({
  generateText: vi.fn(),
  model: vi.fn((modelId: string) => ({ modelId })),
}));

vi.mock("ai", () => ({ generateText: mockAiSdk.generateText }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => mockAiSdk.model),
}));

import { chatWithAi } from "@/lib/ai-client";

const payload = {
  messages: [{ role: "user" as const, content: "Assess this application" }],
  loan_context: "Applicant has verified KYC",
};

describe("AI client fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_SERVICE_URL", "http://127.0.0.1:8000");
    vi.stubEnv("AI_SERVICE_SECRET_KEY", "service-secret");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    mockAiSdk.generateText.mockResolvedValue({
      text: "The application requires manual review.",
      usage: { inputTokens: 12, outputTokens: 7 },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses Gemini directly when the configured AI service is unreachable", async () => {
    const result = await chatWithAi(payload);

    expect(mockAiSdk.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "gemini-2.5-flash" },
        messages: [
          { role: "system", content: "Loan context:\nApplicant has verified KYC" },
          { role: "user", content: "Assess this application" },
        ],
        maxOutputTokens: 2_048,
        timeout: 30_000,
      })
    );
    expect(result).toMatchObject({
      content: "The application requires manual review.",
      model: "gemini-2.5-flash",
      usage: { input_tokens: 12, output_tokens: 7 },
    });
  });

  it("uses Gemini directly when the AI service URL is absent", async () => {
    vi.stubEnv("AI_SERVICE_URL", "");

    const result = await chatWithAi(payload);

    expect(fetch).not.toHaveBeenCalled();
    expect(mockAiSdk.generateText).toHaveBeenCalledOnce();
    expect(result.content).toBe("The application requires manual review.");
  });

  it("returns a typed NEEDS_ENV error when no fallback key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(chatWithAi(payload)).rejects.toMatchObject({
      message: "NEEDS_ENV",
      code: "NEEDS_ENV",
      statusCode: 503,
    });
  });
});
