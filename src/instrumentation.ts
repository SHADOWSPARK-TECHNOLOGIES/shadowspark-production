export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/config/validateEnv");
    validateEnv();

    if (process.env.ENABLE_INLINE_WORKERS !== "true") {
      console.log("Registered instrumentation; inline workers are disabled.");
      return;
    }

    if (process.env.VERCEL) {
      console.warn("Inline workers are not started inside Vercel Functions.");
      return;
    }

    console.log("Registered instrumentation, loading workers...");
    // Dynamic import to avoid edge runtime issues
    const { crawlWorker } = await import("./workers/crawl-worker");
    const { leadWorker } = await import("./workers/lead-worker");
    const { nudgeWorker } = await import("./workers/nudge-worker");
    
    crawlWorker.on('error', err => console.error('crawlWorker Error:', err));
    leadWorker.on('error', err => console.error('leadWorker Error:', err));
    nudgeWorker.on('error', err => console.error('nudgeWorker Error:', err));
  }
}
