import type { Worker } from "bullmq";

import { assertWorkerServiceEnabled } from "./runtime";

assertWorkerServiceEnabled(process.env);

const [{ crawlWorker }, { leadWorker }, { nudgeWorker }] = await Promise.all([
  import("./crawl-worker"),
  import("./lead-worker"),
  import("./nudge-worker"),
]);

const workers: Worker[] = [crawlWorker, leadWorker, nudgeWorker];
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[worker-service] ${signal} received; closing workers...`);
  await Promise.allSettled(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

console.log("[worker-service] crawl, lead, and nudge workers started.");
