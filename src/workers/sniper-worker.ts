 
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { SNIPER_QUEUE, type SniperJobData } from "@/lib/sniper/queue";
import FirecrawlApp from "@mendable/firecrawl-js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "" });

export const sniperWorker = new Worker<SniperJobData>(
  SNIPER_QUEUE,
  async (job) => {
    const { targetId, domain } = job.data;
    console.log(`[sniper-worker] Processing Target: ${domain} (ID: ${targetId})`);

    try {
      // 1. Update status to analyzing
      await prisma.sniperTarget.update({
        where: { id: targetId },
        data: { status: "analyzing" },
      });

      // 2. Firecrawl Scrape
      console.log(`[sniper-worker] Scraping ${domain}...`);
      const scrapeResult: any = await firecrawl.scrape(domain, { formats: ['markdown'] });

      if (!scrapeResult.success || !scrapeResult.markdown) {
        throw new Error(`Failed to scrape ${domain}: ${scrapeResult.error}`);
      }

      // Check for dead links/domains for sale
      const md = scrapeResult.markdown.toLowerCase();
      if (md.includes("domain for sale") || md.includes("404 not found") || md.includes("buy this domain")) {
        console.log(`[sniper-worker] Detected dead link for ${domain}`);
        await prisma.sniperTarget.update({
          where: { id: targetId },
          data: { status: "dead_link" },
        });
        return { ok: false, reason: "dead_link" };
      }

      // 3. Gemini Analysis & Generation
      console.log(`[sniper-worker] Generating payload with Gemini 1.5 Pro...`);
      const prompt = `
You are an elite, highly aggressive outbound sales AI for ShadowSpark.
ShadowSpark provides "Autonomous Revenue Intelligence" - we catch and fix conversion leaks using AI agents.

Analyze the markdown of this target's landing page:
---
${scrapeResult.markdown.substring(0, 15000)} // Ensure we don't blow the context window
---

Identify the single biggest conversion bottleneck on this site (e.g., weak CTA, generic copy, no social proof, broken flows).
Then, write a 3-sentence cold email offering a fix. Use the exact bottleneck in the first sentence. 
Be authoritative, direct, and slightly arrogant but deeply insightful.
Provide ONLY the body of the email. Do not include subject lines or greetings.
`;

      const { text } = await generateText({
        model: google("gemini-1.5-pro"),
        prompt,
      });

      // 4. Save the drafted weaponized payload
      await prisma.sniperTarget.update({
        where: { id: targetId },
        data: {
          status: "draft_ready",
          generatedDraft: text.trim(),
        },
      });

      console.log(`[sniper-worker] Successfully drafted payload for ${domain}`);
      return { ok: true, draftLength: text.length };

    } catch (error) {
      console.error(`[sniper-worker] Error processing ${domain}:`, error);
      // Revert status on failure so it can be retried or manually checked
      await prisma.sniperTarget.update({
        where: { id: targetId },
        data: { status: "new" },
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2, // Keep concurrency low to protect API limits
    limiter: {
      max: 10,
      duration: 60000, // Max 10 requests per minute
    },
  }
);

console.log("[sniper-worker] Booted and listening to queue...");

sniperWorker.on("failed", (job, err) => {
  console.error(`[sniper-worker] Job ${job?.id} failed:`, err);
});
