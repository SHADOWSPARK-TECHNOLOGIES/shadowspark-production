import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { semanticSearchCache } from "@/lib/knowledge/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function semanticSearch(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const cached = semanticSearchCache.get(query);
  if (cached && cached.limit >= limit) {
    return cached.results.slice(0, limit);
  }

  try {
    const embedResult = await model.embedContent(query);
    const vector = embedResult.embedding.values;
    const vectorStr = `[${vector.join(",")}]`;

    const results = await prisma.$queryRaw<any[]>`
      SELECT text, source, type,
             1 - (embedding <=> ${vectorStr}::vector) AS similarity
      FROM "KnowledgeEmbedding"
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
    const formattedResults = results.map((r) => `[Source: ${r.source} | ${r.type}]\n${r.text}`);
    semanticSearchCache.set(query, { results: formattedResults, limit });
    return formattedResults;
  } catch (e) {
    console.error("[Semantic search error]", e);
    return [];
  }
}
