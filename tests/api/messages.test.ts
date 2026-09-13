import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $executeRawUnsafe: vi.fn(),
  $queryRaw: vi.fn(),
  message: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  loanApplication: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const mockQueues = vi.hoisted(() => ({
  enqueueMessageSend: vi.fn(),
  enqueueWorkflowTrigger: vi.fn(),
}));

const mockRedis = vi.hoisted(() => ({
  client: { set: vi.fn() } as { set: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/messages/send-queue", () => ({
  enqueueMessageSend: mockQueues.enqueueMessageSend,
}));

vi.mock("@/lib/workflows/queue", () => ({
  enqueueWorkflowTrigger: mockQueues.enqueueWorkflowTrigger,
}));

vi.mock("@/lib/redis", () => ({
  get redis() {
    return mockRedis.client;
  },
}));

vi.mock("@/lib/twilio", () => ({
  normalizeWhatsAppNumber: vi.fn((value: string) => value.replace(/^whatsapp:/i, "")),
  parseTwilioWebhookPayload: vi.fn(() => ({
    from: "+2348012345678",
    to: "+2348099999999",
    body: "Hello",
    numMedia: 0,
    mediaUrls: [],
    messageSid: "SM123",
    raw: {},
  })),
  verifyTwilioSignature: vi.fn(() => true),
}));

import {
  listMessageConversations,
  sendMessage,
  validateSendMessageInput,
} from "@/lib/api/v1/message-service";
import { processTwilioWebhook } from "@/lib/api/v1/twilio-webhook-service";

describe("messages api services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.client = { set: vi.fn() };
    mockQueues.enqueueMessageSend.mockResolvedValue({ id: "job-message-1" });
    mockRedis.client.set.mockResolvedValue("OK");
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  it("queues an outbound message", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({ id: "loan-1" });
    mockPrisma.message.create.mockResolvedValue({ id: "message-1" });

    const input = validateSendMessageInput({
      channel: "WHATSAPP",
      to: "+2348012345678",
      body: "Hello Ada",
      loanApplicationId: "loan-1",
    });
    const result = await sendMessage("tenant-1", "user-1", input);

    expect(result.status).toBe("QUEUED");
    expect(result.messageId).toBe("message-1");
    expect(mockQueues.enqueueMessageSend).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "message-1",
      })
    );
  });

  it("returns grouped conversations with unread counts", async () => {
    mockPrisma.message.groupBy
      .mockResolvedValueOnce([
        {
          loanApplicationId: "loan-1",
          channel: "WHATSAPP",
          _max: { createdAt: new Date("2026-08-01T10:00:00.000Z") },
        },
      ])
      .mockResolvedValueOnce([
        {
          loanApplicationId: "loan-1",
          channel: "WHATSAPP",
          _count: { _all: 2 },
        },
      ]);
    mockPrisma.loanApplication.findMany.mockResolvedValue([
      {
        id: "loan-1",
        applicantName: "Ada",
        applicantPhone: "+2348012345678",
      },
    ]);
    mockPrisma.message.findFirst.mockResolvedValue({
      id: "msg-last",
      status: "INBOUND",
      content: "Need an update",
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
    });

    const conversations = await listMessageConversations("tenant-1");

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      loanApplicationId: "loan-1",
      unreadCount: 2,
      channel: "WHATSAPP",
    });
  });

  it("processes inbound webhook and deduplicates by MessageSid", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({ id: "loan-1" });
    mockPrisma.message.create.mockResolvedValue({ id: "message-inbound-1" });

    const firstRun = await processTwilioWebhook({
      rawBody: "Body=Hello&MessageSid=SM123&From=whatsapp:+2348012345678",
      requestUrl: "https://example.com/api/v1/webhooks/twilio",
      twilioSignature: "valid-signature",
      tenantId: "tenant-1",
    });

    expect(firstRun).toMatchObject({ deduped: false });
    expect(mockQueues.enqueueWorkflowTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "MESSAGE_RECEIVED" })
    );

    mockRedis.client?.set.mockResolvedValue(null);
    const secondRun = await processTwilioWebhook({
      rawBody: "Body=Hello&MessageSid=SM123&From=whatsapp:+2348012345678",
      requestUrl: "https://example.com/api/v1/webhooks/twilio",
      twilioSignature: "valid-signature",
      tenantId: "tenant-1",
    });

    expect(secondRun).toMatchObject({ deduped: true });
  });

  it("uses the database MessageSid lookup when Redis is absent", async () => {
    mockRedis.client = null;
    mockPrisma.$queryRaw.mockResolvedValue([{ id: "message-inbound-1" }]);

    const result = await processTwilioWebhook({
      rawBody: "Body=Hello&MessageSid=SM123&From=whatsapp:+2348012345678",
      requestUrl: "https://example.com/api/v1/webhooks/twilio",
      twilioSignature: "valid-signature",
      tenantId: "tenant-1",
    });

    expect(result).toEqual({ deduped: true });
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});
