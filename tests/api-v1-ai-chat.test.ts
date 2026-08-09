import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/v1/ai/chat", () => {
  it("returns a content string from the OpenAI-compatible provider", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_BASE_URL = "https://example.com/openai/";
    process.env.CHAT_MODEL = "gemini-2.5-flash";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "E don enter, no wahala.",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/v1/ai/chat/route");
    const request = new NextRequest("http://localhost/api/v1/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Oga, how far my loan?" }],
        stream: false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toBe("E don enter, no wahala.");
    expect(body.reply).toBe("E don enter, no wahala.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/openai/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer\s+/),
        }),
      }),
    );
  });

  it("preserves upstream auth failures", async () => {
    process.env.DEEPSEEK_API_KEY = "bad-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Invalid API key" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/v1/ai/chat/route");
    const request = new NextRequest("http://localhost/api/v1/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Upstream error");
    expect(body.details).toContain("Invalid API key");
    expect(errorSpy).toHaveBeenCalledWith("[api][chat] upstream error", 401);
  });

  it("rejects streaming requests explicitly", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/v1/ai/chat/route");
    const request = new NextRequest("http://localhost/api/v1/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "stream am" }],
        stream: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Streaming is not supported on this endpoint");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
