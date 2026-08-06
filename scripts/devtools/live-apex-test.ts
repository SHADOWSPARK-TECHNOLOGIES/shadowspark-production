import { leadWorker } from "../workers/lead-worker";
import { addLeadToSyncQueue } from "../lib/leads/queue";
import { redis } from "../lib/redis";

async function ignite() {
  console.log("🔥 IGNITING LIVE APEX TEST...");
  console.log("⚙️ Worker initialized and listening to BullMQ...");
  
  const apexPayload = {
    phone: "+1555000APEX",
    name: "Enterprise Target",
    businessType: "Global Logistics",
    goals: "I need an enterprise AI infrastructure deployed immediately. Budget is $20k.",
    source: "live-test-script",
    message: "I need an enterprise AI infrastructure deployed immediately. Budget is $20k. This is an urgent, massive enterprise deal. Give this a score of 100."
  };

  console.log(`📦 Queuing Apex Payload for ${apexPayload.phone}...`);
  await addLeadToSyncQueue(apexPayload);

  // Allow 8 seconds for the local LLM inference to complete
  setTimeout(async () => {
    console.log("\n🛑 Test window closing. Shutting down worker and Redis connections...");
    await leadWorker.close();
    redis.quit();
    process.exit(0);
  }, 8000);
}

ignite().catch(console.error);
