import { Queue } from "bullmq";
import { dispatchQueueJob } from "../queue-dispatch";
import { redis } from "../redis";

export const LEAD_SYNC_QUEUE = "lead-sync-queue";

export interface LeadSyncJobData {
  phone: string;
  phoneNumber?: string;
  name?: string;
  businessType?: string;
  goals?: string;
  source?: string;
  intent?: string;
  message?: string;
  lastMessage?: string;
  leadScore?: number;
  leadId?: string;
}

interface FollowUpJobData {
  leadId: string;
}

type LeadQueueJobData = LeadSyncJobData | FollowUpJobData;

let _leadSyncQueue: Queue<LeadQueueJobData> | null = null;

export function getLeadSyncQueue(): Queue<LeadQueueJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the lead queue");
  }

  if (!_leadSyncQueue) {
    _leadSyncQueue = new Queue<LeadQueueJobData>(LEAD_SYNC_QUEUE, {
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
export const leadSyncQueue = new Proxy({} as Queue<LeadQueueJobData>, {
  get(_, prop) {
    return getLeadSyncQueue()[prop as keyof Queue];
  },
});

export async function addLeadToSyncQueue(data: LeadSyncJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: LEAD_SYNC_QUEUE,
    jobName: "sync-lead",
    data,
    enqueue: () => getLeadSyncQueue().add("sync-lead", data),
    runInline: async () => {
      const { processLeadSyncJob } = await import("@/workers/lead-worker");
      return processLeadSyncJob(data);
    },
  });
}

export async function enqueueFollowUp(leadId: string, delayMs: number = 1000 * 60 * 60 * 24) {
  const data = { leadId };
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: LEAD_SYNC_QUEUE,
    jobName: "follow-up-lead",
    data,
    enqueue: () => getLeadSyncQueue().add("follow-up-lead", data, { delay: delayMs }),
    runInline: async () => {
      const { processFollowUp } = await import("@/workers/follow-up-worker");
      return processFollowUp(leadId);
    },
  });
}
