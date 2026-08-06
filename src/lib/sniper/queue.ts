import { Queue } from "bullmq";
import { redis } from "../redis";

export const SNIPER_QUEUE = "sniper_queue";

export interface SniperJobData {
  targetId: string;
  domain: string;
}

let _sniperQueue: Queue<SniperJobData> | null = null;

export function getSniperQueue(): Queue<SniperJobData> {
  if (!_sniperQueue) {
    _sniperQueue = new Queue<SniperJobData>(SNIPER_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return _sniperQueue;
}

/** @deprecated Use getSniperQueue() instead */
export const sniperQueue = new Proxy({} as Queue<SniperJobData>, {
  get(_, prop) {
    return getSniperQueue()[prop as keyof Queue<SniperJobData>];
  },
});
