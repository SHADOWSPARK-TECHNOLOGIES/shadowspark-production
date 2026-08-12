import { beforeEach, describe, expect, it, vi } from "vitest";

const queueMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  processMessageSendJob: vi.fn(),
}));

vi.mock("bullmq", () => ({ Queue: queueMock.constructor }));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/workers/messaging.worker", () => ({
  processMessageSendJob: queueMock.processMessageSendJob,
  messagingWorker: null,
}));

import { enqueueMessageSend } from "@/lib/messages/send-queue";

describe("message send queue without Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMock.processMessageSendJob.mockResolvedValue({
      messageId: "message-1",
      messageSid: "email-message-1",
    });
  });

  it("processes the message inline without constructing BullMQ", async () => {
    const data = {
      tenantId: "tenant-1",
      channel: "EMAIL" as const,
      to: "applicant@example.com",
      body: "Your application was received.",
      messageId: "message-1",
    };

    const result = await enqueueMessageSend(data);

    expect(queueMock.constructor).not.toHaveBeenCalled();
    expect(queueMock.processMessageSendJob).toHaveBeenCalledWith(data);
    expect(result).toMatchObject({
      inline: true,
      name: "message.send",
      data,
    });
  });
});
