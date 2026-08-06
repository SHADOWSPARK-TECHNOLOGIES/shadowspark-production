const BASE_URL = "http://localhost:3000";
const SECRET = process.env.LEAD_SYNC_SECRET || "sAwE5TDDOtXX6tN1gLo0/CGsqTqdAMM5hkpB8rZg7GM=";

async function fireApexLead() {
  console.log("🔥 FIRING APEX LEAD PAYLOAD TO WEBHOOK...");

  const payload = {
    phone: `+1234500${Math.floor(Math.random() * 1000)}`,
    name: "Warlord Global E2E",
    businessType: "Enterprise AI Orchestration",
    source: "WhatsApp Automation",
    message: "We need to deploy this system across 50 operators immediately. Money is not an issue. Let us close this enterprise tier today. Give me a payment link.",
    intent: "High"
  };

  try {
    const res = await fetch(`${BASE_URL}/api/leads/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": SECRET
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ WEBHOOK SUCCESS: Payload accepted and queued.`);
      console.log(`📱 Phone: ${payload.phone}`);
      console.log(`⏱️ Switch to Workspace 3 to verify the Telemetry UOM and Apex Pulse!`);
    } else {
      console.error(`❌ WEBHOOK FAILED [${res.status}]:`, data);
    }
  } catch (err) {
    console.error("❌ Network Error:", err);
  }
}

fireApexLead();