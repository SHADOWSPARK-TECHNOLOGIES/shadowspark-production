import { prisma } from '../src/lib/prisma';
import { sendOutreach } from '../src/lib/email/send-outreach';

async function main() {
  const email = 'wonderstevie702@gmail.com';
  let lead = await prisma.lead.findUnique({ where: { email } });
  if (!lead) {
    lead = await prisma.lead.create({ data: { email, status: 'new', leadScore: 0 } });
  }
  const result = await sendOutreach({
    leadId: lead.id,
    subject: 'ShadowSpark Test: Confirm Engagement Flow',
    body: 'This is a test to verify tracking. <a href="http://localhost:3000/checkout?test=true">Click here</a>'
  });
  console.log('Email sent:', result);
}

main().catch(err => { console.error(err); process.exit(1); });
