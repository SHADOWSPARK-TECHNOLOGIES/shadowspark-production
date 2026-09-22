import { runRagSync } from "@/lib/rag/sync";

async function runFallbackSync() {
  console.log("=== RAG SYNC (direct, no BullMQ) ===");
  const rootUrl = (process.env.RAG_CRAWL_ROOT_URL || "https://shadowspark-tech.com").trim();
  const limit = Number(process.env.RAG_CRAWL_LIMIT || "3");
  const maxChars = Number(process.env.RAG_CHUNK_MAX_CHARS || "1800");

  const res = await runRagSync({
    rootUrl,
    limit: Number.isFinite(limit) ? limit : 25,
    maxChunkChars: Number.isFinite(maxChars) ? maxChars : 1800,
  });
  console.log(`[rag:sync] complete: ${res.outPath}`);
}

async function main() {
  // Nightly CI has no Redis. Default ioredis → localhost hangs forever once BullMQ is imported.
  const skipQueue =
    process.env.RAG_SYNC_SKIP_QUEUE === "true" ||
    process.env.CI === "true" ||
    !process.env.REDIS_URL;

  if (skipQueue) {
    console.log(
      "[rag:sync] skipping BullMQ queue (CI / no REDIS_URL / RAG_SYNC_SKIP_QUEUE=true)",
    );
    await runFallbackSync();
    process.exit(0);
  }

  const { crawlQueue } = await import("@/lib/crawl/queue");
  const waiting = await crawlQueue.getWaitingCount();
  const active = await crawlQueue.getActiveCount();

  if (waiting + active === 0) {
    console.log("Queue is empty. Running fallback single sync...");
    await runFallbackSync();
    process.exit(0);
  }

  console.log(`Found ${waiting} waiting, ${active} active. Processing...`);
  const { crawlWorker } = await import("@/workers/crawl-worker");
  crawlWorker.on("drained", () => {
    console.log("Queue drained. Exiting.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
