import { Queue } from "bullmq";

import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const CRAWL_QUEUE = "crawl-queue";

export type CrawlJobData = {
  rootUrl: string;
  slug?: string;
  limit?: number;
};

let _crawlQueue: Queue<CrawlJobData> | null = null;

export function getCrawlQueue(): Queue<CrawlJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the crawl queue");
  }

  if (!_crawlQueue) {
    _crawlQueue = new Queue<CrawlJobData>(CRAWL_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
      },
    });
  }
  return _crawlQueue;
}

/** @deprecated Use getCrawlQueue() instead */
export const crawlQueue = new Proxy({} as Queue<CrawlJobData>, {
  get(_, prop) {
    return getCrawlQueue()[prop as keyof Queue<CrawlJobData>];
  },
});

export async function enqueueCrawl(data: CrawlJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: CRAWL_QUEUE,
    jobName: "crawl-and-embed",
    data,
    enqueue: () => getCrawlQueue().add("crawl-and-embed", data),
    runInline: async () => {
      const { processCrawlJob } = await import("@/workers/crawl-worker");
      return processCrawlJob(data);
    },
  });
}
