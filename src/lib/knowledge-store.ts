import fs from 'fs';
import path from 'path';

export function retrieveCompetitiveContext(query: string): string {
  try {
    const filePath = path.join(process.cwd(), 'data', 'firecrawl-knowledge.json');
    if (!fs.existsSync(filePath)) return "";
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const keywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (keywords.length === 0) return "";

    const scored = data.map((chunk: any) => {
      let score = 0;
      keywords.forEach(kw => {
        if (chunk.text.toLowerCase().includes(kw)) score++;
      });
      return { ...chunk, score };
    })
    .filter((c: any) => c.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

    if (scored.length === 0) return "";

    return scored.map((c: any) => `[Competitor Data - ${c.url}]\n${c.text}`).join("\n\n");
  } catch (error) {
    console.error("[RAG STORE ERROR]", error);
    return "";
  }
}