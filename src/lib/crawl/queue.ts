import { Queue } from "bullmq";

import { redis } from "@/lib/redis";

export const CRAWL_QUEUE = "crawl-queue";

export type CrawlJobData = {
  rootUrl: string;
  slug?: string;
  limit?: number;
};

let _crawlQueue: Queue<CrawlJobData> | null = null;

export function getCrawlQueue(): Queue<CrawlJobData> {
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
  return await getCrawlQueue().add("crawl-and-embed", data);
}
