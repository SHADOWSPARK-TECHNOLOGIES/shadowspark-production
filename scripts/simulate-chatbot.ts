import { createLead } from '../src/lib/lead-service';
import { prisma } from '../src/lib/prisma';
import { scheduleDemoForLead } from '../src/lib/demo-service';

async function main() {
  const email = 'wonderstevie702@gmail.com';
  const intent = 'I want to schedule a demo and evaluate ShadowSpark for my infrastructure needs.';

  const res = await createLead({ email, intent });
  console.log('Lead created/upserted:', res.lead.id);

  const schedule = await scheduleDemoForLead(res.lead.id, email);
  console.log('Demo scheduled. Checkout URL:', schedule.checkoutUrl);
}

main().catch(err => { console.error(err); process.exit(1); });
