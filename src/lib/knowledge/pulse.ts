import { prisma } from "@/lib/prisma";

export async function getMarketPulse() {
  const competitors = ['Intercom', 'Zendesk', 'Drift', 'Crisp', 'Freshworks', 'Tidio'];
  
  const pulseData = await Promise.all(competitors.map(async (name) => {
    // Querying the Africa Node for specific pricing and feature chunks
    const results = await prisma.$queryRaw<any[]>`
      SELECT similarity_score, text 
      FROM search_knowledge(${name + " enterprise pricing automation"}, 0.7, 0.3) 
      LIMIT 1
    `;

    const score = results[0]?.similarity_score || 0;
    
    return {
      name,
      relevance: (score * 100).toFixed(1),
      status: score > 0.6 ? 'VOLATILE' : 'STABLE', // Higher relevance means we have more "intel" to exploit
    };
  }));

  return pulseData;
}
