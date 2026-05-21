/**
 * Usage:
 * Import retrieve or retrieveWithEmbeddings to query the local knowledge base.
 * 
 * Description:
 * In-memory RAG store that loads chunks at startup. Provides keyword-based
 * retrieval with intent detection (pricing) and boosting (case studies).
 * Includes scaffolding for a future pgvector transition.
 */

import fs from 'fs';
import path from 'path';

export interface Chunk {
  source: string;
  url: string;
  pageType: string;
  chunkIndex: number;
  content: string;
}

export interface RAGStore {
  retrieve(query: string): Chunk[];
  retrieveWithEmbeddings(query: string): Promise<Chunk[]>;
}

let knowledgeBase: Chunk[] = [];

// Load chunks from data/firecrawl-knowledge.json at startup
function initStore() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'firecrawl-knowledge.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      knowledgeBase = JSON.parse(fileData) as Chunk[];
      console.log(`[RAG Store] Loaded ${knowledgeBase.length} chunks into memory.`);
    } else {
      console.warn('[RAG Store] data/firecrawl-knowledge.json not found. Run the crawler script first.');
    }
  } catch (error) {
    console.error('[RAG Store] Failed to load knowledge base:', error);
  }
}

// Run initialization synchronously at module load
initStore();

function calculateRelevanceScore(query: string, chunk: Chunk): number {
  const queryLower = query.toLowerCase();
  const contentLower = chunk.content.toLowerCase();
  const queryWords = queryLower.match(/\b\w+\b/g) || [];
  
  let score = 0;

  // Basic keyword matching
  for (const word of queryWords) {
    if (word.length > 2 && contentLower.includes(word)) {
      score += 0.1;
    }
  }

  // Case-study boosting
  const isCaseStudyType = chunk.pageType === 'case-study';
  const caseStudyKeywords = ['roi', 'results', 'revenue', 'growth', '%'];
  const hasCaseStudyKeywords = caseStudyKeywords.some(kw => contentLower.includes(kw));
  
  if (isCaseStudyType || hasCaseStudyKeywords) {
    score += 0.3;
  }

  // Intent detection: Pricing
  const pricingIntentKeywords = ['price', 'cost', 'plan', '₦', 'naira'];
  const hasPricingIntent = pricingIntentKeywords.some(kw => queryLower.includes(kw));
  
  if (hasPricingIntent && chunk.pageType === 'pricing') {
    score += 0.2;
  }

  return score;
}

/**
 * Implement keyword-based retrieval (no embeddings yet)
 * Return top 5 most relevant chunks
 */
export function retrieve(query: string): Chunk[] {
  if (!query || !query.trim()) {
    return [];
  }

  const scoredChunks = knowledgeBase.map(chunk => ({
    chunk,
    score: calculateRelevanceScore(query, chunk)
  }));

  // Sort by descending score
  scoredChunks.sort((a, b) => b.score - a.score);

  // Return top 5 chunks that have at least some relevance (score > 0)
  return scoredChunks
    .filter(item => item.score > 0)
    .slice(0, 5)
    .map(item => item.chunk);
}

export function retrieveCompetitiveContext(query: string): string {
  const chunks = retrieve(query);
  if (chunks.length === 0) return '';
  return chunks.map(c => `[${c.pageType}] ${c.content}`).join('\n\n');
}

/**
 * Placeholder function signature for future pgvector migration
 */
import { semanticSearch } from './embedding-store';

export async function retrieveWithEmbeddings(query: string): Promise<Chunk[]> {
  try {
    const results = await semanticSearch(query, 5);
    if (!results || results.length === 0) return [];

    // semanticSearch returns strings like: "[Source: src | type]\ntext"
    const parsed: Chunk[] = results.map((r) => {
      const parts = r.split('\n');
      const meta = parts[0] || '';
      const text = parts.slice(1).join('\n') || '';
      const m = /\[Source:\s*(.*?)\s*\|\s*(.*?)\]/.exec(meta);
      const source = m ? m[1] : 'unknown';
      const type = m ? m[2] : 'limitations';
      return {
        source,
        url: text.slice(0, 120), // best-effort placeholder
        pageType: type.replace(/[^a-zA-Z0-9\-]/g, '-'),
        chunkIndex: -1,
        content: text,
      } as Chunk;
    });

    return parsed;
  } catch (e) {
    console.warn('[RAG] retrieveWithEmbeddings failed, falling back to keyword retrieval', e);
    return retrieve(query);
  }
}
