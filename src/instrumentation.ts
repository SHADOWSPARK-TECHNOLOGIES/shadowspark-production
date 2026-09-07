type WorkerEnvironment = {
  NEXT_RUNTIME?: string;
  NEXT_PHASE?: string;
  WORKERS_ENABLED?: string;
};

export function shouldStartWorkers(env: WorkerEnvironment): boolean {
  return (
    env.NEXT_RUNTIME === "nodejs" &&
    env.NEXT_PHASE !== "phase-production-build" &&
    env.WORKERS_ENABLED === "true"
  );
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/config/validateEnv");
    validateEnv();

    if (!shouldStartWorkers(process.env)) {
      console.log("Registered instrumentation; background workers are disabled.");
      return;
    }

    console.log("Registered instrumentation, loading background workers...");
    // Dynamic import to avoid edge runtime issues
    const { crawlWorker } = await import("./workers/crawl-worker");
    const { leadWorker } = await import("./workers/lead-worker");
    const { nudgeWorker } = await import("./workers/nudge-worker");
    
    crawlWorker.on('error', err => console.error('crawlWorker Error:', err));
    leadWorker.on('error', err => console.error('leadWorker Error:', err));
    nudgeWorker.on('error', err => console.error('nudgeWorker Error:', err));
  }
}
