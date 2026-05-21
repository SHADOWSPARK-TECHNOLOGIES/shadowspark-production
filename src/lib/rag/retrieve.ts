import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";

import { requireEnv } from "@/lib/env";
import { loadRagIndex } from "@/lib/rag/store";
import { loadLatestVaultIndex } from "@/lib/gcs/fetch-audit";
import type { RagEmbeddingChunk, RagEmbeddingIndex } from "@/lib/rag/types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let a2 = 0;
  let b2 = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    a2 += a[i] * a[i];
    b2 += b[i] * b[i];
  }
  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom === 0 ? 0 : dot / denom;
}

export type RagHit = {
  score: number;
  chunk: RagEmbeddingChunk;
};

export async function retrieveRagContext(args: {
  query: string;
  slug?: string;
  k?: number;
}): Promise<{ context: string; hits: RagHit[] } | null> {
  
  let index: RagEmbeddingIndex | null = null;
  
  if (args.slug) {
    index = await loadLatestVaultIndex(args.slug);
  }
  
  if (!index) {
    index = await loadRagIndex();
  }

  if (!index || index.chunks.length === 0) return null;

  const google = createGoogleGenerativeAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  const model = google.textEmbeddingModel(index.embeddingModel || "gemini-embedding-001");

  const { embedding } = await embed({
    model,
    value: args.query,
  });

  const scored = index.chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(embedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, args.k ?? 4);

  const contextLines: string[] = ["RAG_CONTEXT (curated excerpts):"];
  for (const hit of scored) {
    const title = hit.chunk.title ? ` (${hit.chunk.title})` : "";
    const url = hit.chunk.url ? ` ${hit.chunk.url}` : "";
    contextLines.push(`- [${hit.score.toFixed(3)}]${title}${url}`);
    contextLines.push(hit.chunk.text);
  }

  return { context: contextLines.join("\n"), hits: scored };
}

