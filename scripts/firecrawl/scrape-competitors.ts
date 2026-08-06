import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const TARGETS = [
  "https://www.chatbase.co/pricing",
  "https://www.intercom.com/pricing",
  "https://botpress.com/pricing"
];

async function main() {
  console.log(`[Competitor Scraper] Initiating Extraction Protocol (Jina Bypass)...`);
  
  const outDir = path.join(process.cwd(), "data", "rag");
  await fs.mkdir(outDir, { recursive: true }).catch(() => {});

  let combinedIntel = "# COMPETITOR INTELLIGENCE & OBJECTION HANDLING\n\n";

  for (const url of TARGETS) {
    console.log(`\n> Scraping target via Jina: ${url}`);
    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain' }
      });
      const markdown = await response.text();

      // Split by headers to create your chunks
      const chunks = markdown.split(/\n(?=# )/g);
      
      console.log(`[+] Captured ${chunks.length} Intel Chunks for: ${url}`);

      combinedIntel += `## Intel for: ${url}\n`;
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        combinedIntel += chunk.trim() + "\n\n";
      }
      combinedIntel += `\n---\n\n`;

    } catch (error) {
      console.error(`[!] Error scraping ${url}:`, error);
    }
  }

  const intelPath = path.join(outDir, "competitor-intel.md");
  await fs.writeFile(intelPath, combinedIntel, "utf-8");
  console.log(`\n[SUCCESS] Intelligence compiled and saved to ${intelPath}`);
  console.log(`[NEXT STEP] Ensure this file is ingested into your RAG sync.`);
}

main().catch(console.error);
