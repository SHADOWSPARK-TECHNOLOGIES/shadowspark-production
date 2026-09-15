import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// GET must not invoke the external AI or WhatsApp providers.
vi.mock("@/lib/whatsapp/send-payment-link", () => ({ sendTextWhatsApp: vi.fn() }));
vi.mock("@/lib/ai/whatsapp-bot", () => ({ getBotReply: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function verify(token: string | null, mode = "subscribe", challenge = "challenge-123") {
  const { GET } = await import("@/app/api/webhooks/whatsapp/meta/route");
  const url = new URL("https://example.test/api/webhooks/whatsapp/meta");
  url.searchParams.set("hub.mode", mode);
  if (token !== null) url.searchParams.set("hub.verify_token", token);
  if (challenge) url.searchParams.set("hub.challenge", challenge);
  return GET(new NextRequest(url));
}

describe("WhatsApp verification configuration", () => {
  it.each([undefined, "", "   "])("fails closed when configured token is %s", async (value) => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", value);
    expect((await verify(value ?? null)).status).toBe(503);
  });

  it("echoes a challenge only for the configured token", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "synthetic-token-for-test");
    const response = await verify("synthetic-token-for-test");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("challenge-123");
  });

  it.each([
    ["wrong-token", "subscribe", "challenge"],
    [null, "subscribe", "challenge"],
    ["synthetic-token-for-test", "wrong-mode", "challenge"],
    ["synthetic-token-for-test", "subscribe", ""],
  ])("rejects invalid verification inputs", async (token, mode, challenge) => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "synthetic-token-for-test");
    expect((await verify(token, mode!, challenge!)).status).toBe(403);
  });
});
