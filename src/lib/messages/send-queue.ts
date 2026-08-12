import { Queue } from "bullmq";

import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const MESSAGE_SEND_QUEUE = "message-send";

export interface MessageSendJobData {
  tenantId: string;
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  to: string;
  body: string;
  mediaUrl?: string;
  loanApplicationId?: string;
  templateId?: string;
  variables?: Record<string, string>;
  messageId: string;
}

let messageSendQueueInstance: Queue<MessageSendJobData> | null = null;

function getMessageSendQueue(): Queue<MessageSendJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for BullMQ message delivery");
  }

  if (!messageSendQueueInstance) {
    messageSendQueueInstance = new Queue<MessageSendJobData>(MESSAGE_SEND_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return messageSendQueueInstance;
}

/** Queues message delivery or runs the existing delivery processor inline. */
export async function enqueueMessageSend(data: MessageSendJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: MESSAGE_SEND_QUEUE,
    jobName: "message.send",
    data,
    enqueue: () => getMessageSendQueue().add("message.send", data),
    runInline: async () => {
      const { processMessageSendJob } = await import("@/workers/messaging.worker");
      return processMessageSendJob(data);
    },
  });
}
