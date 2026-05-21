import { PrismaClient } from './src/generated/prisma/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'sa-key.json';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const count = await p.knowledgeEmbedding.count();
  console.log('✅ FINAL VECTOR COUNT:', count);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
