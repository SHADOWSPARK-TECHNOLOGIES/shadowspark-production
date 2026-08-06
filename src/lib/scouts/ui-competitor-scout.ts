import FirecrawlApp from '@mendable/firecrawl-js';

// This script requires the FIRECRAWL_API_KEY environment variable to be set.
const scout = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

async function runUIScout() {
  const targets = [
    "https://linear.app/features", 
    "https://clay.com",
    "https://stripe.com"
  ];
  
  for (const url of targets) {
    try {
      console.log(`📡 Scouting ${url}...`);
      const result = await scout.scrape(url, {
        formats: ["markdown"],
      });

      console.log(`💎 Intelligence Captured for ${url}:`);
      console.log(result.markdown?.slice(0, 2000) ?? "No markdown returned.");

    } catch (error) {
      console.error(`❌ Failed to scout ${url}:`, error);
    }
  }
}

runUIScout();
