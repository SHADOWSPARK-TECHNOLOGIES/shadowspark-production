import { prisma } from '../src/lib/prisma';
import { updateLeadEngagement } from '../src/lib/scoring/engagement-scorer';

async function main() {
  const email = 'wonderstevie702@gmail.com';
  const lead = await prisma.lead.findUnique({ where: { email } });
  if (!lead) {
    console.error('Lead not found');
    process.exit(1);
  }
  const leadId = lead.id;

  await prisma.emailEvent.create({ data: { leadId, type: 'opened', metadata: { timestamp: new Date().toISOString() } } });
  await updateLeadEngagement(leadId, 'opened', { timestamp: new Date().toISOString() });
  console.log('Processed opened');

  await prisma.emailEvent.create({ data: { leadId, type: 'clicked', metadata: { link: 'http://localhost:3000/checkout?test=true', timestamp: new Date().toISOString() } } });
  await updateLeadEngagement(leadId, 'clicked', { link: 'http://localhost:3000/checkout?test=true', timestamp: new Date().toISOString() });
  console.log('Processed clicked');

  const updated = await prisma.lead.findUnique({ where: { id: leadId } });
  console.log('Lead after events:', { score: updated?.leadScore, tier: updated?.tier, status: updated?.status });
}

main().catch(err => { console.error(err); process.exit(1); });
