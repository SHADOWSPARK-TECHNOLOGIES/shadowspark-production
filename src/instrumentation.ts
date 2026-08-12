export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/config/validateEnv");
    validateEnv();
    console.log("Registered instrumentation, loading workers...");
    // Dynamic import to avoid edge runtime issues
    const { crawlWorker } = await import("./workers/crawl-worker");
    const { leadWorker } = await import("./workers/lead-worker");
    const { nudgeWorker } = await import("./workers/nudge-worker");
    
    crawlWorker?.on("error", (error) => console.error("crawlWorker Error:", error));
    leadWorker?.on("error", (error) => console.error("leadWorker Error:", error));
    nudgeWorker?.on("error", (error) => console.error("nudgeWorker Error:", error));
  }
}
