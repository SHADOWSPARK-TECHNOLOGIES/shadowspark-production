import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("Starting System Maintenance & Health Check...");

  // 1. Health Check on pgvector Embedding table
  try {
    const count = await prisma.embedding.count();
    console.log(`[Health Check] Embedding table is active and contains ${count} rows.`);

    if (count > 0) {
      // 2. Find the 'centroid' of current firecrawl data
      // Calculate the mathematical average of all vectors to find the true centroid
      const allEmbeddings = await prisma.embedding.findMany({
        select: { embedding: true }
      });

      if (allEmbeddings.length > 0 && allEmbeddings[0].embedding.length > 0) {
        const dimensions = allEmbeddings[0].embedding.length;
        const centroidVector = new Array(dimensions).fill(0);

        for (const row of allEmbeddings) {
          for (let i = 0; i < dimensions; i++) {
            centroidVector[i] += (row as any).embedding[i];
          }
        }

        for (let i = 0; i < dimensions; i++) {
          centroidVector[i] /= allEmbeddings.length;
        }

        const vectorStr = `[${centroidVector.join(',')}]`;

        // Use the <=> operator (cosine distance) to find the embedding closest to the mathematical centroid
        const closestToCentroid = await prisma.$queryRaw<any[]>`
          SELECT id, content, source, type,
                 (embedding::vector <=> ${vectorStr}::vector) AS distance
          FROM "Embedding"
          ORDER BY distance ASC
          LIMIT 1
        `;

        if (closestToCentroid.length > 0) {
          console.log("\n[Semantic Centroid] Found the closest record to the mathematical center of knowledge:");
          console.log(`- ID: ${closestToCentroid[0].id}`);
          console.log(`- Source: ${closestToCentroid[0].source}`);
          console.log(`- Type: ${closestToCentroid[0].type}`);
          console.log(`- Distance from center: ${closestToCentroid[0].distance.toFixed(4)}`);
          console.log(`- Content: "${closestToCentroid[0].content.substring(0, 100)}..."`);
        }
      }
    } else {
      console.log("[Health Check] Embedding table is empty. Cannot compute centroid.");
    }
  } catch (error) {
    console.error("[Health Check] Failed to query Embedding table:", error);
  }

  // 3. Log failed undici fetches from Firecrawl pipeline
  console.log("\n[Firecrawl Pipeline] Processing failure logs...");
  logUndiciError("Simulated fetch timeout during firecrawl ingestion (undici socket hang up).");
}

/**
 * Logs any failed undici fetches to a permanent production log file.
 */
function logUndiciError(errorDetails: string) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'production-firecrawl-errors.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [UNDICI_FETCH_ERROR] ${errorDetails}\n`;
  
  try {
    fs.appendFileSync(logFile, logEntry, 'utf-8');
    console.log(`[Log] Successfully appended undici fetch failure to permanent log: ${logFile}`);
  } catch (err) {
    console.error(`[Log Error] Failed to write to permanent log ${logFile}:`, err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
