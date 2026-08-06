import { prisma } from './src/lib/prisma';
import { sendOutreach } from './src/lib/email/send-outreach';
import { updateLeadEngagement } from './src/lib/scoring/engagement-scorer';
import { processFollowUp } from './src/workers/follow-up-worker';

async function runTest() {
  console.log("==================================================");
  console.log("   SHADOWSPARK E2E REVENUE LOOP VERIFICATION");
  console.log("==================================================");
  
  const testEmail = "wonderstevie702@gmail.com";
  const observations: any = {};

  try {
    console.log(`\n[1] Preparing Test Lead: ${testEmail}`);
    let lead = await prisma.lead.upsert({
      where: { email: testEmail },
      update: { leadScore: 0, status: 'NEW', tier: 'starter', nextFollowUpAt: null },
      create: { email: testEmail, status: 'NEW', intent: 'E2E Testing' }
    });
    observations.leadCreated = !!lead.id;
    console.log(`   -> Lead Ready. ID: ${lead.id}`);

    console.log(`\n[2] Sending Controlled Outreach Payload...`);
    try {
      const emailRes = await sendOutreach({
        leadId: lead.id,
        subject: 'ShadowSpark Test: Confirm Engagement Flow',
        body: 'This is a test to verify tracking. Click here: http://localhost:3000/checkout?test=true'
      });
      observations.emailSent = emailRes.success;
      observations.messageId = emailRes.messageId;
      console.log(`   -> Email Dispatched. ID: ${emailRes.messageId || 'simulated'}`);
    } catch (e: any) {
      console.warn(`   -> Email failed (Simulated mode active or missing key).`);
      observations.emailSent = false;
    }

    console.log(`\n[3] Simulating Webhook Engagement (Open & Clicks)...`);
    await updateLeadEngagement(lead.id, 'opened');
    await updateLeadEngagement(lead.id, 'clicked', { link: 'http://localhost:3000/checkout?test=true' });
    await updateLeadEngagement(lead.id, 'clicked', { link: 'http://localhost:3000/checkout?test=other' });
    
    await new Promise(res => setTimeout(res, 2000));
    
    console.log(`\n[4] Verifying Database State Updates...`);
    lead = await prisma.lead.findUnique({ where: { id: lead.id } }) as any;
    const events = await prisma.emailEvent.findMany({ where: { leadId: lead.id } });
    
    observations.finalScore = lead.leadScore;
    observations.finalTier = lead.tier;
    observations.finalStatus = lead.status;
    observations.eventCount = events.length;

    console.log(`   -> Lead Score: ${lead.leadScore} (Expected ~16: +1 open, +5 click, +10 bonus)`);
    console.log(`   -> Tier: ${lead.tier}`);
    console.log(`   -> Status: ${lead.status}`);
    console.log(`   -> Logged Tracking Events: ${events.length}`);

    console.log(`\n[5] Triggering Autonomous Follow-Up Engine...`);
    const followUpRes = await processFollowUp(lead.id);
    observations.followUpTriggered = followUpRes.success;
    
    if (followUpRes.success) {
       console.log(`   -> Follow-up drafted and sent successfully via Gemini & Resend.`);
    } else {
       console.log(`   -> Follow-up skipped/failed: ${followUpRes.reason || (followUpRes as any).error}`);
    }

    lead = await prisma.lead.findUnique({ where: { id: lead.id } }) as any;
    observations.nextFollowUpAt = !!lead.nextFollowUpAt;
    console.log(`   -> Next FollowUp Scheduled For: ${lead.nextFollowUpAt}`);

    console.log("\n==================================================");
    console.log("   OBSERVATION SUMMARY");
    console.log("==================================================");
    console.log(JSON.stringify(observations, null, 2));

  } catch (error) {
    console.error("\n[!] FATAL TEST ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();