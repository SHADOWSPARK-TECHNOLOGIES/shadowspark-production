import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '../data/knowledge.json');
const TARGET_URLS = [
  'https://docs.shadowspark.ai',      // Replace with actual targets
  'https://shadowspark.ai/pricing',
  'https://shadowspark.ai/features',
];
const MAX_CHUNK_SIZE = 500; // words

interface Document {
  url: string;
  title: string;
  chunks: string[];
  metadata: {
    source: string;
    crawledAt: string;
  };
}

interface KnowledgeBase {
  lastUpdated: string;
  documents: Document[];
}

function cleanHtml(html: string): string {
  // Basic cleanup – in production use cheerio or similar
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chunkText(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords - 50) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    if (chunk.length > 50) chunks.push(chunk);
  }
  return chunks;
}

export async function crawlAndProcess(): Promise<void> {
  console.log(`Starting Jina scrape of ${TARGET_URLS.length} target URLs...`);
  
  const documents: Document[] = [];
  for (const url of TARGET_URLS) {
    try {
      console.log(`Scraping ${url} via Jina...`);
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain' }
      });
      const markdown = await response.text();

      // Split by headers to create your chunks
      const chunks = markdown.split(/\n(?=# )/g);
      const processedChunks = chunks
        .map(c => c.trim())
        .filter(Boolean);
      
      documents.push({
        url,
        title: url,
        chunks: processedChunks,
        metadata: {
          source: 'jina',
          crawledAt: new Date().toISOString(),
        },
      });

      console.log(`✓ Scraped ${url} – ${processedChunks.length} chunks`);
      
      // Polite delay
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error processing ${url}:`, err);
    }
  }

  // Step 3: Write to JSON
  const knowledgeBase: KnowledgeBase = {
    lastUpdated: new Date().toISOString(),
    documents,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(knowledgeBase, null, 2));
  console.log(`Knowledge base saved to ${OUTPUT_PATH} (${documents.length} docs)`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  crawlAndProcess().catch(console.error);
}
