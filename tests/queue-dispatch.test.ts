import { beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchQueueJob } from "@/lib/queue-dispatch";

describe("queue dispatch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses BullMQ unchanged when Redis is configured", async () => {
    const queued = { id: "job-1" };
    const enqueue = vi.fn(async () => queued);
    const runInline = vi.fn(async () => ({ processed: true }));

    const result = await dispatchQueueJob({
      redisAvailable: true,
      queueName: "message-send",
      jobName: "message.send",
      data: { messageId: "message-1" },
      enqueue,
      runInline,
    });

    expect(result).toBe(queued);
    expect(enqueue).toHaveBeenCalledOnce();
    expect(runInline).not.toHaveBeenCalled();
  });

  it("runs jobs inline and logs the fallback only once without Redis", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const enqueue = vi.fn(async () => ({ id: "queued" }));
    const runInline = vi.fn(async () => ({ processed: true }));

    const first = await dispatchQueueJob({
      redisAvailable: false,
      queueName: "message-send",
      jobName: "message.send",
      data: { messageId: "message-1" },
      enqueue,
      runInline,
    });
    await dispatchQueueJob({
      redisAvailable: false,
      queueName: "workflow-triggers",
      jobName: "workflow.trigger",
      data: { entityId: "message-1" },
      enqueue,
      runInline,
    });

    expect(first).toMatchObject({
      inline: true,
      name: "message.send",
      data: { messageId: "message-1" },
      returnvalue: { processed: true },
    });
    expect(enqueue).not.toHaveBeenCalled();
    expect(runInline).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      "[queues] REDIS_URL is not set; running BullMQ jobs inline (first queue: message-send).",
    );
  });
});
