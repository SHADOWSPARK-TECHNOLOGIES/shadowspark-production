import { Queue } from "bullmq";
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

export async function enqueueMessageSend(data: MessageSendJobData) {
  return getMessageSendQueue().add("message.send", data);
}
