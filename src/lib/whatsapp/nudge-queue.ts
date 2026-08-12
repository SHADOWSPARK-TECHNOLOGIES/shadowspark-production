import { Queue } from "bullmq";
import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const WHATSAPP_NUDGE_QUEUE = "whatsapp-nudges";

export type NudgeJobData = {
  leadId: string;
  phoneNumber: string;
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  amountKobo: number;
  tier: string;
};

let _whatsappNudgeQueue: Queue<NudgeJobData> | null = null;

export function getWhatsappNudgeQueue(): Queue<NudgeJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the WhatsApp nudge queue");
  }

  if (!_whatsappNudgeQueue) {
    _whatsappNudgeQueue = new Queue<NudgeJobData>(WHATSAPP_NUDGE_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return _whatsappNudgeQueue;
}

/** @deprecated Use getWhatsappNudgeQueue() instead */
export const whatsappNudgeQueue = new Proxy({} as Queue<NudgeJobData>, {
  get(_, prop) {
    return getWhatsappNudgeQueue()[prop as keyof Queue<NudgeJobData>];
  },
});

export async function enqueuePaymentNudge(data: NudgeJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: WHATSAPP_NUDGE_QUEUE,
    jobName: "send-payment-nudge",
    data,
    enqueue: () => getWhatsappNudgeQueue().add("send-payment-nudge", data),
    runInline: async () => {
      const { processNudgeJob } = await import("@/workers/nudge-worker");
      return processNudgeJob(data);
    },
  });
}
