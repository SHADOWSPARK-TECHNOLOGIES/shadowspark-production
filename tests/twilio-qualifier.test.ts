import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leadFindUnique: vi.fn(),
  leadUpsert: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  redisIncr: vi.fn(),
  redisExpire: vi.fn(),
  redisDecr: vi.fn(),
  generateAssistantReply: vi.fn(),
  sendTwilioMessage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findUnique: mocks.leadFindUnique,
      upsert: mocks.leadUpsert,
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    set: mocks.redisSet,
    del: mocks.redisDel,
    incr: mocks.redisIncr,
    expire: mocks.redisExpire,
    decr: mocks.redisDecr,
  },
}));

vi.mock("@/lib/llm", () => ({
  generateAssistantReply: mocks.generateAssistantReply,
}));

vi.mock("@/lib/twilio", async () => {
  const actual = await vi.importActual<typeof import("@/lib/twilio")>("@/lib/twilio");
  return {
    ...actual,
    sendTwilioMessage: mocks.sendTwilioMessage,
  };
});

import { POST } from "@/app/api/webhooks/twilio/route";
import { advanceQualifier, classifyQualifierTag, type QualifierState } from "@/lib/twilio-qualifier";

const AUTH_TOKEN = "twilio-test-token";
const URL = "https://app.example.com/api/webhooks/twilio";
const FROM = "whatsapp:+2348012345678";

function params(messageSid: string, body: string): URLSearchParams {
  return new URLSearchParams({
    MessageSid: messageSid,
    From: FROM,
    To: "whatsapp:+14155552671",
    Body: body,
  });
}

function request(form: URLSearchParams, signature = sign(form)): Request {
  return new Request(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature,
    },
    body: form,
  });
}

function sign(form: URLSearchParams): string {
  const payload = URL + [...form.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  return createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64");
}

describe("four-turn qualifier", () => {
  it("progresses through need, institution/country, volume/pain, and name/slot", () => {
    let state: QualifierState = { step: 0, answers: [], messageSids: [] };
    const answers = [
      "Need lead automation",
      "A university in Nigeria",
      "500 leads and slow follow-up",
      "Ada, Friday at 2pm",
    ];

    for (const answer of answers) {
      const result = advanceQualifier(state, answer);
      state = result.state;
    }

    expect(state.step).toBe(4);
    expect(state.tag).toBe("Hot");
    expect(state.answers).toEqual(answers);
  });

  it("classifies short low-intent answers as Cold and detailed answers as Warm", () => {
    expect(classifyQualifierTag(["Just looking"])).toBe("Cold");
    expect(classifyQualifierTag([
      "Need a better workflow",
      "Private school in Ghana",
      "Our follow-up is manual",
    ])).toBe("Warm");
  });
});

describe("POST /api/webhooks/twilio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = AUTH_TOKEN;
    delete process.env.TWILIO_WEBHOOK_URL;
    delete process.env.TWILIO_NOTIFY_TO;
    mocks.redisSet.mockResolvedValue("OK");
    mocks.redisDel.mockResolvedValue(1);
    mocks.redisIncr.mockResolvedValue(1);
    mocks.redisExpire.mockResolvedValue(1);
    mocks.redisDecr.mockResolvedValue(1);
    mocks.leadFindUnique.mockResolvedValue(null);
    mocks.leadUpsert.mockResolvedValue({ id: "lead-1" });
    mocks.generateAssistantReply.mockResolvedValue({ provider: "script", text: "Script reply" });
    mocks.sendTwilioMessage.mockResolvedValue({ success: true, messageId: "SM-out" });
  });

  it("rejects invalid signatures before persistence", async () => {
    const response = await POST(request(params("SM-invalid", "hi"), "bad"));

    expect(response.status).toBe(403);
    expect(mocks.leadUpsert).not.toHaveBeenCalled();
  });

  it("returns the next qualifier prompt and persists the lead", async () => {
    const response = await POST(request(params("SM-1", "Need lead automation")));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("Which institution and country are you with?");
    expect(mocks.leadUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phoneNumber: "+2348012345678" },
        create: expect.objectContaining({ phoneNumber: "+2348012345678", status: "NEW" }),
      }),
    );
  });

  it("does not process a duplicate MessageSid", async () => {
    mocks.redisSet.mockResolvedValue(null);

    const response = await POST(request(params("SM-duplicate", "hi")));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<Response/>");
    expect(mocks.leadUpsert).not.toHaveBeenCalled();
  });

  it("uses the LLM for freeform messages during the 24-hour window", async () => {
    const now = new Date().toISOString();
    mocks.leadFindUnique.mockResolvedValueOnce({
      id: "lead-1",
      phoneNumber: "+2348012345678",
      status: "QUALIFIED",
      tier: "Hot",
      metadata: {
        twilioQualifier: {
          step: 4,
          answers: ["Need automation", "University in Nigeria", "500 leads", "Ada, Friday"],
          messageSids: [],
          lastInboundAt: now,
          completedAt: now,
          tag: "Hot",
        },
      },
    });

    const response = await POST(request(params("SM-freeform", "What happens next?")));

    expect(await response.text()).toContain("Script reply");
    expect(mocks.generateAssistantReply).toHaveBeenCalledWith("What happens next?");
  });

  it("does not reply outside the 24-hour freeform window", async () => {
    mocks.leadFindUnique.mockResolvedValueOnce({
      id: "lead-1",
      phoneNumber: "+2348012345678",
      status: "QUALIFIED",
      metadata: {
        twilioQualifier: {
          step: 4,
          answers: [],
          messageSids: [],
          lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          tag: "Warm",
        },
      },
    });

    const response = await POST(request(params("SM-expired", "hello again")));

    expect(await response.text()).toBe("<Response/>");
    expect(mocks.generateAssistantReply).not.toHaveBeenCalled();
  });

  it("enforces the 80-message daily outbound cap", async () => {
    mocks.redisIncr.mockResolvedValue(81);

    const response = await POST(request(params("SM-cap", "hi")));

    expect(await response.text()).toBe("<Response/>");
    expect(mocks.leadUpsert).toHaveBeenCalled();
    expect(mocks.redisDecr).toHaveBeenCalled();
  });
});
