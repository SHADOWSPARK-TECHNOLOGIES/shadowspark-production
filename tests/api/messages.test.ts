import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  message: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
  enqueueMessage: vi.fn(),
  enqueueWorkflowTrigger: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/messages/queue", () => ({
  enqueueMessage: mockQueues.enqueueMessage,
}));

vi.mock("@/lib/workflows/queue", () => ({
  enqueueWorkflowTrigger: mockQueues.enqueueWorkflowTrigger,
}));

import {
  listConversations,
  sendMessage,
  sendMessageSchema,
} from "@/lib/api/v1/message-service";

describe("messages api services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueues.enqueueMessage.mockResolvedValue(undefined);
  });

  it("queues an outbound message", async () => {
    mockPrisma.message.create.mockResolvedValue({
      id: "message-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      channel: "whatsapp",
      direction: "OUTBOUND",
      status: "QUEUED",
      content: "Hello Ada",
      senderId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const input = sendMessageSchema.parse({
      channel: "whatsapp",
      content: "Hello Ada",
      loanApplicationId: "loan-1",
    });
    const result = await sendMessage("tenant-1", input, "user-1");

    expect(result.status).toBe("QUEUED");
    expect(result.id).toBe("message-1");
    expect(mockQueues.enqueueMessage).toHaveBeenCalledWith(
      "tenant-1",
      "message-1",
    );
  });

  it("returns grouped conversations", async () => {
    const createdAt = new Date("2026-08-01T10:00:00.000Z");
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: "msg-last",
        loanApplicationId: "loan-1",
        channel: "whatsapp",
        status: "INBOUND",
        content: "Need an update",
        createdAt,
        loanApplication: {
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
        },
      },
    ]);

    const conversations = await listConversations("tenant-1");

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      loanApplicationId: "loan-1",
      channel: "whatsapp",
      applicantName: "Ada",
    });
  });
});
