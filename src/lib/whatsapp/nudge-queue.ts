import { Queue } from "bullmq";
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
  return await getWhatsappNudgeQueue().add("send-payment-nudge", data);
}
