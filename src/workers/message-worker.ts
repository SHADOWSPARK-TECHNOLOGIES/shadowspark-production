import { startMessageWorker } from "@/lib/messages/queue";

const worker = startMessageWorker();

worker?.on("completed", (job) => {
  console.log(`[message-worker] completed ${job.id}`);
});

worker?.on("failed", (job, err) => {
  console.error(`[message-worker] failed ${job?.id}:`, err);
});

if (worker) console.log("[message-worker] started");
