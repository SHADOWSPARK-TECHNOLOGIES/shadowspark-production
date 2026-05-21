import { prisma } from '../prisma';
import { getEmbedding } from '../ai/embed';
import fs from 'fs';
import path from 'path';

import { competitiveContextCache } from './cache';

export const COMPETITIVE_CONTEXT_THRESHOLD = 0.6;
export const HYBRID_SEARCH_LIMIT = 20;
export const SIMILARITY_WEIGHT = 0.7;
export const KEYWORD_WEIGHT = 0.3;
export const INTENT_BOOST_MULTIPLIER = 1.5;
export const TOP_RESULTS_COUNT = 5;

export interface Chunk {
  chunkId?: number;
  source: string;
  url?: string;
  type?: string;
  text?: string;
  pageType?: string;
  chunkIndex?: number;
  content?: string;
  verified?: boolean;
}

type RetrievalRow = {
  chunkId: number | null;
  source: string;
  url: string | null;
  type: string;
  text: string;
  similarity: number;
}

let knowledgeBase: Chunk[] = [];

// Initialize memory-based cross-reference store
function initStore() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'firecrawl-knowledge.json');
    if (fs.existsSync(filePath)) {
      knowledgeBase = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Chunk[];
    }
  } catch (error) {
    console.error('[RAG Store] Failed to load knowledge base for cross-referencing:', error);
  }
}
initStore();

function normalizeChunkText(chunk: Chunk): string {
  return chunk.text ?? chunk.content ?? '';
}

function normalizeChunkType(chunk: Chunk): string {
  return chunk.type ?? chunk.pageType ?? 'unknown';
}

function detectIntent(query: string): 'pricing' | 'general' {
  const normalized = query.toLowerCase();
  if (
    normalized.includes('price') ||
    normalized.includes('cost') ||
    normalized.includes('how much')
  ) {
    return 'pricing';
  }
  return 'general';
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function keywordMatchScore(queryTerms: string[], text: string): number {
  if (queryTerms.length === 0) return 0;

  const haystackTerms = new Set(tokenize(text));
  if (haystackTerms.size === 0) return 0;

  const uniqueQueryTerms = [...new Set(queryTerms)];
  let hits = 0;

  for (const queryTerm of uniqueQueryTerms) {
    if (haystackTerms.has(queryTerm)) {
      hits += 1;
    }
  }

  return hits / uniqueQueryTerms.length;
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

async function fetchKnowledgeEmbeddingRows(queryVector: number[], queryText: string): Promise<RetrievalRow[]> {
  const columns = await getKnowledgeEmbeddingColumns();
  const chunkIdColumn = columns.has('chunkId') ? '"chunkId"' : '"chunkIndex"';
  const textColumn = columns.has('text') ? 'text' : 'content';
  const typeColumn = columns.has('type') ? 'type' : 'pageType';
  const urlSelect = columns.has('url') ? 'url' : 'NULL::text AS url';
  const vectorStr = `[${queryVector.join(',')}]`;

  // Database-level Hybrid Search: pgvector + Full-Text Search
  return prisma.$queryRawUnsafe<RetrievalRow[]>(
    `WITH semantic_search AS (
       SELECT ${chunkIdColumn} AS "chunkId",
              source,
              ${urlSelect},
              "${typeColumn}" AS type,
              ${textColumn} AS text,
              (1 - (embedding <=> $1::vector)) AS vector_score,
              ts_rank_cd(to_tsvector('english', ${textColumn}), plainto_tsquery('english', $3)) AS fts_score
       FROM "KnowledgeEmbedding"
     )
     SELECT "chunkId", source, url, type, text,
            ((vector_score * 0.7) + (fts_score * 0.3)) AS similarity
     FROM semantic_search
     ORDER BY similarity DESC
     LIMIT $2`,
    vectorStr,
    HYBRID_SEARCH_LIMIT,
    queryText
  );
}

function resolveSourceUrl(row: RetrievalRow): string {
  if (row.url) return row.url;

  const matchingChunk = knowledgeBase.find((chunk) => {
    const chunkText = normalizeChunkText(chunk);
    return (
      (typeof chunk.chunkId === 'number' && chunk.chunkId === row.chunkId) ||
      chunkText === row.text ||
      (chunk.source === row.source && normalizeChunkType(chunk) === row.type)
    );
  });

  return matchingChunk?.url ?? row.source;
}

/**
 * Hybrid Retrieval: Combines pgvector semantic similarity + keyword matching + intent detection
 * Returns top 5 most relevant competitive intelligence results
 */
export async function retrieveCompetitiveContext(query: string): Promise<string> {
  if (!query || !query.trim()) return "";

  const cached = competitiveContextCache.get(query);
  if (cached !== null) {
    return cached;
  }

  try {
    // Phase 1: Get embedding and fetch semantically similar rows
    const queryVector = await getEmbedding(query);
    const rows = await fetchKnowledgeEmbeddingRows(queryVector, query);

    if (!rows || rows.length === 0) {
      competitiveContextCache.set(query, "");
      return "";
    }

    // Phase 2: Analyze query intent
    const queryTerms = tokenize(query);
    const intent = detectIntent(query);
    const maxSimilarity = Math.max(...rows.map((row) => Number(row.similarity) || 0));
    const useKeywordFallback = maxSimilarity < COMPETITIVE_CONTEXT_THRESHOLD;

    // Phase 3: Hybrid scoring - combine semantic + keyword + intent signals
    const scoredRows = rows.map((row) => {
      const similarity = Number(row.similarity) || 0;
      const keywordScore = keywordMatchScore(queryTerms, row.text);
      const contentTypeMatch = intent === 'pricing' && row.type === 'pricing' ? INTENT_BOOST_MULTIPLIER : 1;
      
      // Hybrid score: weighted combination of semantic and keyword signals
      let hybridScore = (SIMILARITY_WEIGHT * similarity) + (KEYWORD_WEIGHT * keywordScore);
      
      // Apply intent-based boosting if content type matches query intent
      hybridScore *= contentTypeMatch;

      return {
        ...row,
        similarity,
        keywordScore,
        hybridScore,
      };
    });

    // Phase 4: Ranking strategy based on confidence level
    let finalRanked = scoredRows;
    
    if (useKeywordFallback) {
      // Low confidence: rely more on keyword matching
      finalRanked = scoredRows
        .map((row) => {
          let keywordBoost = row.keywordScore;
          if (intent === 'pricing' && row.type === 'pricing') {
            keywordBoost *= INTENT_BOOST_MULTIPLIER;
          }
          return { ...row, finalScore: keywordBoost };
        })
        .filter((row) => row.finalScore > 0)
        .sort((a, b) => b.finalScore - a.finalScore);
    } else {
      // Good confidence: use hybrid score
      finalRanked = scoredRows
        .filter((row) => row.hybridScore > 0)
        .sort((a, b) => b.hybridScore - a.hybridScore);
    }

    // Phase 5: Return top 5 results
    const ranked = finalRanked.slice(0, TOP_RESULTS_COUNT);

    if (ranked.length === 0) {
      competitiveContextCache.set(query, "");
      return "";
    }

    // Phase 6: Determine confidence label for transparency
    const confidenceLabel =
      !useKeywordFallback && maxSimilarity >= 0.85
        ? "High Confidence Competitive Intelligence"
        : useKeywordFallback || maxSimilarity < 0.6
        ? "Low Confidence Context"
        : "Context";

    // Phase 7: Format results with source attribution
    const contexts = ranked.map((row) => {
      const sourceUrl = resolveSourceUrl(row);
      return `[Source: ${sourceUrl} | ${row.type}]\n${row.text}`;
    });

    const result = `[${confidenceLabel}]\n\n${contexts.join("\n\n")}`;
    competitiveContextCache.set(query, result);
    return result;
  } catch (error) {
    console.error("[RAG STORE HYBRID RETRIEVAL ERROR]", error);
    return "";
  }
}
