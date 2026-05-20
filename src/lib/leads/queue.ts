import { Queue } from "bullmq";
import { redis } from "../redis";

export const LEAD_SYNC_QUEUE = "lead-sync-queue";

let _leadSyncQueue: Queue | null = null;

export function getLeadSyncQueue(): Queue {
  if (!_leadSyncQueue) {
    _leadSyncQueue = new Queue(LEAD_SYNC_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      },
    });
  }
  return _leadSyncQueue;
}

/** @deprecated Use getLeadSyncQueue() instead */
export const leadSyncQueue = new Proxy({} as Queue, {
  get(_, prop) {
    return getLeadSyncQueue()[prop as keyof Queue];
  },
});

export async function addLeadToSyncQueue(data: any) {
  return await getLeadSyncQueue().add("sync-lead", data);
}

export async function enqueueFollowUp(leadId: string, delayMs: number = 1000 * 60 * 60 * 24) {
  return await getLeadSyncQueue().add("follow-up-lead", { leadId }, { delay: delayMs });
}
