import fs from 'fs';
import path from 'path';

interface KnowledgeChunk {
  url: string;
  text: string;
  chunkId: number;
  source: string;
  type: 'pricing' | 'features' | 'limitations' | 'case_study';
  verified: boolean;
}

function loadData(): KnowledgeChunk[] {
  const filePath = path.join(process.cwd(), 'data', 'firecrawl-knowledge.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function detectIntent(query: string): 'pricing' | 'features' | 'limitations' | 'case_study' {
  const q = query.toLowerCase();
  if (q.includes('price') || q.includes('cost') || q.includes('how much')) return 'pricing';
  if (q.includes('case study') || q.includes('example') || q.includes('roi') || q.includes('results')) return 'case_study';
  if (q.includes('feature') || q.includes('what can') || q.includes('capability')) return 'features';
  return 'limitations';
}

export function retrieveCompetitiveContext(query: string): string {
  try {
    const data = loadData().filter(c => c.verified);
    if (data.length === 0) return '';

    const intent = detectIntent(query);
    const caseStudyBoost = query.toLowerCase().includes('case') || query.toLowerCase().includes('roi') || query.toLowerCase().includes('result');

    const scored = data.map(chunk => {
      let score = 0;
      const words = query.split(/\W+/);
      words.forEach(word => {
        if (word.length > 2 && chunk.text.toLowerCase().includes(word.toLowerCase())) score++;
      });

      if (chunk.type === intent) score += 3;
      if (caseStudyBoost && chunk.type === 'case_study') score += 5;

      return { ...chunk, score };
    });

    const results = scored
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (results.length === 0) return '';
    return results.map(c => `[Source: ${c.source} | ${c.type}]\n\n${c.text}`).join('\n\n---\n\n');
  } catch (error) {
    console.error('[RAG ERROR]', error);
    return '';
  }
}

// Placeholder for future embedding-based retrieval
export async function retrieveWithEmbeddings(query: string): Promise<string> {
  // TODO: replace with pgvector similarity search
  return retrieveCompetitiveContext(query);
}
