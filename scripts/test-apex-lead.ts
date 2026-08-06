import { addLeadToSyncQueue } from "../src/lib/leads/queue";
import { redis } from "../src/lib/redis";

async function testApexLead() {
  console.log("🚀 Injecting Apex Lead into BullMQ...");
  
  const apexLeadPayload = {
    phone: "+1234567890",
    name: "Warlord Testing",
    businessType: "Enterprise Software",
    source: "WhatsApp Pipeline Test",
    message: "I have 50 operators ready to deploy this software globally. I need to buy the enterprise tier immediately. Money is not an issue, let's close this today.",
  };

  try {
    const job = await addLeadToSyncQueue(apexLeadPayload);
    console.log(`✅ Lead Enqueued successfully. Job ID: ${job.id}`);
    
    // Disconnect so the script can exit
    setTimeout(() => {
      redis.disconnect();
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error("❌ Failed to enqueue lead:", err);
    process.exit(1);
  }
}

testApexLead();
