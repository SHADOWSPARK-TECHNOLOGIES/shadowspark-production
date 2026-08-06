 
import { crawlWorker } from "@/workers/crawl-worker";
import { crawlQueue } from "@/lib/crawl/queue";
import { runRagSync } from "@/lib/rag/sync";

async function main() {
  console.log("=== BATCH CRAWL PROCESSOR ===");
  const waiting = await crawlQueue.getWaitingCount();
  const active = await crawlQueue.getActiveCount();
  
  if (waiting + active === 0) {
    console.log("Queue is empty. Running fallback single sync...");
    const rootUrl = (process.env.RAG_CRAWL_ROOT_URL || "https://shadowspark-tech.org/blog").trim();
    const limit = Number(process.env.RAG_CRAWL_LIMIT || "3");
    const maxChars = Number(process.env.RAG_CHUNK_MAX_CHARS || "1800");

    const res = await runRagSync({
      rootUrl,
      limit: Number.isFinite(limit) ? limit : 25,
      maxChunkChars: Number.isFinite(maxChars) ? maxChars : 1800,
    });
    console.log(`[rag:sync] fallback sync complete: ${res.outPath}`);
    process.exit(0);
  }
  
  console.log(`Found ${waiting} waiting, ${active} active. Processing...`);
  
  crawlWorker.on('drained', () => {
    console.log("Queue drained. Exiting.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
