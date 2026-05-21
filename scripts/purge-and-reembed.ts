import path from 'path';
import { PrismaClient } from '../src/generated/prisma/client/index.js';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { GoogleGenerativeAI } from '@google/generative-ai';
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

const TARGETS = [
  { url: "https://www.chatbase.co/pricing", source: "chatbase" },
  { url: "https://www.intercom.com/pricing", source: "intercom" },
  { url: "https://botpress.com/pricing", source: "botpress" },
  { url: "https://www.intercom.com", source: "intercom" },
  { url: "https://www.zendesk.com", source: "zendesk" },
  { url: "https://www.drift.com", source: "drift" }
];

async function embed(text: string): Promise<number[]> {
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function classifyChunk(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('price') || t.includes('$') || t.includes('cost') || t.includes('billing')) return 'pricing';
  return 'features';
}

async function getKnowledgeEmbeddingColumns(): Promise<Set<string>> {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'KnowledgeEmbedding'
  `;
  return new Set(columns.map((column) => column.column_name));
}

async function main() {
  console.log("🧹 Purging existing jina_reader and competitor vectors...");
  
  // Delete all rows associated with these sources or jina
  await prisma.$executeRaw`DELETE FROM "KnowledgeEmbedding" WHERE source IN ('jina', 'jina_reader', 'intercom', 'zendesk', 'drift', 'chatbase', 'botpress')`;
  
  const columns = await getKnowledgeEmbeddingColumns();
  let chunkIdCounter = Math.floor(Date.now() / 1000); // Unique starting chunk ID based on timestamp

  for (const target of TARGETS) {
    console.log(`\n🕵️ Scrape & Re-Embed: ${target.url}`);
    try {
      const response = await fetch(`https://r.jina.ai/${target.url}`, {
        headers: { 'Accept': 'text/plain' }
      });
      const markdown = await response.text();
      const chunks = markdown.split(/\n(?=# )/g);
      
      let success = 0;
      for (const chunk of chunks) {
        const text = chunk.trim();
        if (!text) continue;
        
        try {
          const vector = await embed(text);
          const vectorStr = `[${vector.join(',')}]`;
          const type = classifyChunk(text);
          chunkIdCounter++;

          if (columns.has('metadata')) {
            await prisma.$executeRaw`
              INSERT INTO "KnowledgeEmbedding" (
                id, "chunkId", source, url, type, text, embedding, "createdAt", "updatedAt", metadata
              )
              VALUES (
                gen_random_uuid(), ${chunkIdCounter}, ${target.source}, ${target.url}, ${type}, ${text}, ${vectorStr}::vector, NOW(), NOW(), '{"source": "jina_reader"}'::jsonb
              )
              ON CONFLICT ("chunkId") DO NOTHING
            `;
          } else {
            await prisma.$executeRaw`
              INSERT INTO "KnowledgeEmbedding" (
                id, "chunkId", source, url, type, text, embedding, "createdAt", "updatedAt"
              )
              VALUES (
                gen_random_uuid(), ${chunkIdCounter}, ${target.source}, ${target.url}, ${type}, ${text}, ${vectorStr}::vector, NOW(), NOW()
              )
              ON CONFLICT ("chunkId") DO NOTHING
            `;
          }
          success++;
        } catch (e) {
          console.error(`  Failed to embed chunk for ${target.url}`);
        }
      }
      console.log(`  ✅ Inserted ${success} clean vectors for ${target.url}`);
    } catch (e) {
      console.error(`Failed to process ${target.url}:`, e);
    }
  }
  
  console.log("\n🎉 Johannesburg Node populated with Clean Intelligence!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
