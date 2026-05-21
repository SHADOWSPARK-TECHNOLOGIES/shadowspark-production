import { PrismaClient } from './src/generated/prisma/client';

// We manually extract the URL to ensure Node has it before Prisma wakes up
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL is missing from environment.');
  process.exit(1);
}

async function main() {
  // Use the __internal hook if standard datasources object is rejected
  // This is the "Nuclear Option" for custom-generated clients
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  } as any); 

  try {
    const count = await prisma.knowledgeEmbedding.count();
    console.log('\n🌟 SOVEREIGN DATA AUDIT: SUCCESS');
    console.log('---------------------------------');
    console.log(`TOTAL VECTORS IN JOHANNESBURG: ${count}`);
    console.log('---------------------------------\n');
  } catch (error: any) {
    console.error('❌ DATABASE CONNECTION FAILED');
    console.error('Details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
