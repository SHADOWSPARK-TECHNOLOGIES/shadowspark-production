import { addLeadToSyncQueue } from "../lib/leads/queue";
import { redis } from "../lib/redis";

async function runSimulation() {
  console.log("🚀 Initiating PIS Simulation Sequence...");

  // High Intent Lead
  const apexLead = {
    phone: "+1234567890",
    name: "Enterprise Director",
    businessType: "Logistics Fleet",
    goals: "We need an immediate deployment for 500 vehicles. Budget is approved. Need an integration within 48 hours.",
    source: "simulation-script",
    lastMessage: "I have the corporate card ready, who do I talk to?",
  };

  // Low Intent Lead
  const standardLead = {
    phone: "+0987654321",
    name: "Curious Student",
    businessType: "School Project",
    goals: "Just looking around to see what AI can do.",
    source: "simulation-script",
    lastMessage: "What is your pricing like? I'm just doing a school project.",
  };

  await addLeadToSyncQueue(apexLead);
  console.log("✅ Apex Lead queued for synchronization.");

  await addLeadToSyncQueue(standardLead);
  console.log("✅ Standard Lead queued for synchronization.");

  // Close redis connection after queuing so the script can exit
  setTimeout(() => {
      redis.quit();
      console.log("Simulation queuing complete.");
  }, 1000);
}

runSimulation().catch(console.error);
