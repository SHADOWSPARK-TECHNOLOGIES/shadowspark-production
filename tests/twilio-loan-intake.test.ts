import { createHmac } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import {
  buildConversationResolution,
  getConversationKey,
  type ConversationRecord,
} from "@/lib/conversation-state";
import {
  normalizeWhatsAppNumber,
  parseTwilioWebhookPayload,
  twilioEmptyResponseXml,
  verifyTwilioSignature,
} from "@/lib/twilio";

describe("twilio helpers", () => {
  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = "twilio-test-token";
  });

  it("normalizes WhatsApp numbers", () => {
    expect(normalizeWhatsAppNumber("whatsapp:+2348012345678")).toBe("+2348012345678");
    expect(normalizeWhatsAppNumber("08012345678")).toBe("+2348012345678");
  });

  it("parses Twilio webhook payloads", () => {
    const payload = parseTwilioWebhookPayload(
      new URLSearchParams({
        From: "whatsapp:+2348012345678",
        To: "whatsapp:+2349012345678",
        Body: "hello",
        NumMedia: "2",
        MediaUrl0: "https://example.com/a.jpg",
        MediaUrl1: "https://example.com/b.jpg",
        MessageSid: "SM123",
      })
    );

    expect(payload.from).toBe("+2348012345678");
    expect(payload.to).toBe("+2349012345678");
    expect(payload.mediaUrls).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("verifies Twilio signatures", () => {
    const url = "https://example.com/api/webhooks/twilio";
    const params = new URLSearchParams({
      Body: "hello",
      From: "whatsapp:+2348012345678",
      MessageSid: "SM123",
      To: "whatsapp:+2349012345678",
    });

    const signature = createHmac("sha1", "twilio-test-token")
      .update(
        `${url}BodyhelloFromwhatsapp:+2348012345678MessageSidSM123Towhatsapp:+2349012345678`
      )
      .digest("base64");

    expect(verifyTwilioSignature(url, params, signature)).toBe(true);
    expect(verifyTwilioSignature(url, params, "bad-signature")).toBe(false);
  });

  it("returns empty TwiML", () => {
    expect(twilioEmptyResponseXml()).toBe("<Response/>");
  });
});

describe("conversation state machine", () => {
  const baseRecord: ConversationRecord = {
    state: "IDLE",
    tenantId: "public",
    phone: "+2348012345678",
    loanApplicationId: "loan-1",
    data: {},
    updatedAt: new Date().toISOString(),
  };

  it("starts a conversation at the NAME step", () => {
    const result = buildConversationResolution(baseRecord, {
      text: "Hello",
      from: "+2348012345678",
      mediaUrls: [],
    });

    expect(result.nextState).toBe("NAME");
    expect(result.prompt).toContain("full name");
  });

  it("moves from NAME to PHONE when a name is supplied", () => {
    const result = buildConversationResolution(
      { ...baseRecord, state: "NAME" },
      {
        text: "Ada Okafor",
        from: "+2348012345678",
        mediaUrls: [],
      }
    );

    expect(result.nextState).toBe("PHONE");
    expect(result.data.name).toBe("Ada Okafor");
  });

  it("submits after review confirmation", () => {
    const result = buildConversationResolution(
      {
        ...baseRecord,
        state: "REVIEW",
        data: {
          name: "Ada Okafor",
          phone: "+2348012345678",
          amount: "250000",
          purpose: "Inventory restock",
        },
      },
      {
        text: "YES",
        from: "+2348012345678",
        mediaUrls: [],
      }
    );

    expect(result.nextState).toBe("SUBMITTED");
    expect(result.shouldPersistLoan).toBe(true);
  });

  it("builds stable conversation keys", () => {
    expect(getConversationKey("public", "+2348012345678")).toBe("conv:public:+2348012345678");
  });
});
