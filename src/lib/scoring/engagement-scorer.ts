import { prisma } from '@/lib/prisma';

export async function updateLeadEngagement(leadId: string, eventType: string, metadata?: any) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  let scoreDelta = 0;
  let newScore = lead.leadScore || 0;

  if (eventType === 'opened') {
    scoreDelta = 1;
  } else if (eventType === 'clicked') {
    scoreDelta = 5;
    
    const currentLink = metadata?.link;
    if (currentLink) {
      // Analyze previous clicks to detect multi-link engagement
      const pastClicks = await prisma.emailEvent.findMany({
        where: { leadId, type: 'clicked' },
      });
      
      const uniqueLinks = new Set(
        pastClicks
          .map(e => (e.metadata as any)?.link)
          .filter(Boolean)
      );
      
      // If they have clicked exactly 1 unique link previously, 
      // and this is a NEW unique link, hit them with the +10 bonus.
      if (uniqueLinks.size === 1 && !uniqueLinks.has(currentLink)) {
         scoreDelta += 10;
      }
    }
  }

  if (scoreDelta === 0) return;

  newScore += scoreDelta;

  // Evaluate Tier
  let newTier = 'starter';
  if (newScore >= 80) newTier = 'enterprise';
  else if (newScore >= 50) newTier = 'pro';

  // Evaluate Status
  let newStatus = lead.status;
  const protectedStatuses = ['demo_scheduled', 'WON', 'CONVERTED', 'QUALIFIED'];
  if (newScore >= 70 && !protectedStatuses.includes(newStatus)) {
    newStatus = 'HIGH_INTENT';
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: newScore,
      tier: newTier,
      status: newStatus
    }
  });

  console.log(`[SCORING ENGINE] Lead ${leadId} engagement processed. Score: ${newScore} | Tier: ${newTier} | Status: ${newStatus}`);
}
