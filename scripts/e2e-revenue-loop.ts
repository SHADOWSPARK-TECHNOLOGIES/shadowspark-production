import { addLeadToSyncQueue } from "../src/lib/leads/queue";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

async function executeE2ETest() {
  console.log("===========================================");
  console.log("🔥 INITIATING END-TO-END REVENUE LOOP TEST");
  console.log("===========================================\n");
  
  const apexPhone = `+1234500${Math.floor(Math.random() * 1000)}`;

  const apexLeadPayload = {
    phone: apexPhone,
    name: "Warlord Global E2E",
    businessType: "Enterprise AI Orchestration",
    source: "WhatsApp Pipeline Test",
    message: "We need to deploy this system across 50 operators immediately. Money is not an issue. Let us close this enterprise tier today. Give me a payment link.",
  };

  try {
    // 1. Simulate Webhook -> Queue Ingestion
    console.log(`[1] 📥 Simulating Webhook Ingestion...`);
    const job = await addLeadToSyncQueue(apexLeadPayload);
    console.log(`    ✅ Lead enqueued in BullMQ (Job ID: ${job.id}). Phone: ${apexPhone}`);
    
    // 2. Wait for background processing (Queue -> LLM Inference -> DB Upsert)
    console.log(`\n[2] 🧠 Waiting for SES/PIS Inference and DB Upsert (10s)...`);
    
    let processedLead = null;
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      processedLead = await prisma.lead.findUnique({
        where: { phoneNumber: apexPhone }
      });
      
      if (processedLead && processedLead.leadScore) {
        break; // Processed!
      }
      attempts++;
      process.stdout.write(".");
    }

    console.log("\n");

    if (processedLead && processedLead.leadScore) {
      console.log(`[3] ⚡ PIPELINE SUCCESS! Lead Processed.`);
      console.log(`    - Status:   ${processedLead.status}`);
      console.log(`    - PIS Score: ${processedLead.leadScore} / 100`);
      
      const audit = processedLead.miniAuditData as any;
      if (audit && audit.reasoning) {
        console.log(`    - Reasoning: "${audit.reasoning}"`);
      }

      if (processedLead.leadScore > 85) {
        console.log(`\n[4] 🚀 APEX LEAD TRIGGERED! (Cyan-Pulse should be visible on Dashboard)`);
      }
    } else {
      console.log(`[3] ❌ PIPELINE TIMEOUT. Lead not processed within timeframe.`);
      console.log(`    Ensure 'npx tsx src/workers/lead-worker.ts' and AnythingLLM are running.`);
    }

    // Cleanup and exit
    console.log("\n===========================================");
    console.log("TEST CONCLUDED.");
    console.log("===========================================");
    
    setTimeout(() => {
      redis.disconnect();
      prisma.$disconnect();
      process.exit(0);
    }, 1000);
    
  } catch (err) {
    console.error("\n❌ E2E Test Failed:", err);
    process.exit(1);
  }
}

executeE2ETest();
