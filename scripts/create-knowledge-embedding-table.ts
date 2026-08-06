import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('Creating pgvector extension and KnowledgeEmbedding table (if not exists)...');
    await prisma.$executeRaw`
      CREATE EXTENSION IF NOT EXISTS vector;
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "KnowledgeEmbedding" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source text,
        url text,
        "pageType" text,
        "chunkIndex" integer,
        content text,
        embedding vector(1536),
        "updatedAt" timestamptz DEFAULT now()
      );
    `;

    console.log('✅ Table ensured.');
  } catch (e) {
    console.error('❌ Failed to ensure table:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
