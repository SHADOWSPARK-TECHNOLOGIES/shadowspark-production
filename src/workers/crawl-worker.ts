 
import { Worker } from "bullmq";

import { CRAWL_QUEUE, type CrawlJobData } from "@/lib/crawl/queue";
import { redis } from "@/lib/redis";
import { runRagSync } from "@/lib/rag/sync";

/** Runs one crawl job independently of BullMQ transport. */
export async function processCrawlJob(data: CrawlJobData, jobId = "inline") {
  const rootUrl = data.rootUrl;
  const slug = data.slug;
  const limit = data.limit ?? 25;

  console.log(`[crawl-worker] received job ${jobId} rootUrl=${rootUrl} slug=${slug || "none"} limit=${limit}`);

  const res = await runRagSync({
    rootUrl,
    slug,
    limit,
    maxChunkChars: Number(process.env.RAG_CHUNK_MAX_CHARS || "1800"),
  });

  return { ok: true, ...res };
}

export const crawlWorker = redis
  ? new Worker<CrawlJobData>(
      CRAWL_QUEUE,
      async (job) => processCrawlJob(job.data, job.id),
      {
        connection: redis,
        concurrency: 3,
        limiter: {
          max: 5,
          duration: 1000,
        },
        // Firecrawl crawls can take up to 120s; extend lock duration to match
        lockDuration: 180_000,
      }
    )
  : null;

crawlWorker?.on("completed", (job) => {
  console.log(`[crawl-worker] job ${job.id} completed`);
});

crawlWorker?.on("failed", (job, err) => {
  console.error(`[crawl-worker] job ${job?.id} failed: ${err.message}`);
});

// Keep the process alive if this file is executed directly.
void crawlWorker;
