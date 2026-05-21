 
import { Worker } from "bullmq";

import { CRAWL_QUEUE, type CrawlJobData } from "@/lib/crawl/queue";
import { redis } from "@/lib/redis";
import { runRagSync } from "@/lib/rag/sync";

export const crawlWorker = new Worker<CrawlJobData>(
  CRAWL_QUEUE,
  async (job) => {
    const rootUrl = job.data.rootUrl;
    const slug = job.data.slug;
    const limit = job.data.limit ?? 25;

    console.log(`[crawl-worker] received job ${job.id} rootUrl=${rootUrl} slug=${slug || "none"} limit=${limit}`);

    const res = await runRagSync({
      rootUrl,
      slug,
      limit,
      maxChunkChars: Number(process.env.RAG_CHUNK_MAX_CHARS || "1800"),
    });

    return { ok: true, ...res };
  },
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
);

crawlWorker.on("completed", (job) => {
  console.log(`[crawl-worker] job ${job.id} completed`);
});

crawlWorker.on("failed", (job, err) => {
  console.error(`[crawl-worker] job ${job?.id} failed: ${err.message}`);
});

// Keep the process alive if this file is executed directly.
void crawlWorker;
