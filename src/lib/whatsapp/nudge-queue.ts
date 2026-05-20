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

export const whatsappNudgeQueue = new Queue<NudgeJobData>(WHATSAPP_NUDGE_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function enqueuePaymentNudge(data: NudgeJobData) {
  return await whatsappNudgeQueue.add("send-payment-nudge", data);
}
