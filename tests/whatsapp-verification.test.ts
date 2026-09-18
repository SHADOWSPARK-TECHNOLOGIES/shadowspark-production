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

describe("WhatsApp inbound POST signature verification", () => {
  const secret = "test-meta-app-secret-12345";
  const payload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "12345", phone_number_id: "phone-1" },
            },
            field: "messages",
          },
        ],
      },
    ],
  });

  async function postWebhook(body: string, signatureHeader?: string) {
    const { POST } = await import("@/app/api/webhooks/whatsapp/meta/route");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (signatureHeader) headers["x-hub-signature-256"] = signatureHeader;
    return POST(
      new NextRequest("https://example.test/api/webhooks/whatsapp/meta", {
        method: "POST",
        headers,
        body,
      })
    );
  }

  it("fails closed with 503 when app secret is not configured", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.META_APP_SECRET;
    const res = await postWebhook(payload, "sha256=abcdef");
    expect(res.status).toBe(503);
  });

  it("fails closed with 401 when signature header is missing or malformed", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", secret);
    const missingRes = await postWebhook(payload);
    expect(missingRes.status).toBe(401);

    const malformedRes = await postWebhook(payload, "invalid-prefix-abcdef");
    expect(malformedRes.status).toBe(401);
  });

  it("fails closed with 403 when signature does not match", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", secret);
    const badRes = await postWebhook(payload, "sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    expect(badRes.status).toBe(403);
  });

  it("accepts valid HMAC-SHA256 signature and returns 200", async () => {
    const { createHmac } = await import("node:crypto");
    vi.stubEnv("WHATSAPP_APP_SECRET", secret);
    const validSignature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    const res = await postWebhook(payload, validSignature);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });
});
