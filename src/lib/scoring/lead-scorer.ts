export async function scoreLead(email: string, metadata?: any): Promise<number> {
  let score = 50; // baseline
  
  // Domain authority: common free email domains get penalty
  const domain = email.split('@')[1]?.toLowerCase();
  const freeDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  if (domain && freeDomains.includes(domain)) score -= 20;
  
  // Company email bonus
  if (domain && !freeDomains.includes(domain)) score += 15;
  
  // Source quality
  if (metadata?.source === 'pricing_page') score += 10;
  if (metadata?.source === 'enterprise_landing') score += 25;
  
  // In future: call LLM to analyze email handle for role (e.g., 'ceo', 'cto')
  
  return Math.min(100, Math.max(0, score));
}
