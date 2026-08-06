import fs from 'fs';
import path from 'path';
import { generateAndStoreEmbedding } from '../src/lib/ai/embed';
import 'dotenv/config';

async function sync() {
  const filePath = path.join(process.cwd(), 'data', 'firecrawl-knowledge.json');
  if (!fs.existsSync(filePath)) {
    console.error('Knowledge file not found.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log("Starting sync of " + data.length + " chunks...");

  for (const item of data) {
    try {
      console.log("Embedding: " + item.url);
      await generateAndStoreEmbedding(
        item.text,
        item.url || item.source,
        item.type || 'general'
      );
    } catch (err) {
      console.error("Failed to embed " + item.url + ":", err);
    }
  }

  console.log('Sync complete.');
}

sync().catch(console.error);
