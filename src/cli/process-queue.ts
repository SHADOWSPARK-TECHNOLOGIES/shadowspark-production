 
import { crawlWorker } from "@/workers/crawl-worker";
import { crawlQueue } from "@/lib/crawl/queue";

async function main() {
  console.log("=== BATCH CRAWL PROCESSOR ===");
  const waiting = await crawlQueue.getWaitingCount();
  const active = await crawlQueue.getActiveCount();
  
  if (waiting + active === 0) {
    console.log("Queue is empty. Exiting.");
    process.exit(0);
  }
  
  console.log(`Found ${waiting} waiting, ${active} active. Processing...`);
  
  crawlWorker.on('drained', () => {
    console.log("Queue drained. Exiting.");
    process.exit(0);
  });
}
main();
