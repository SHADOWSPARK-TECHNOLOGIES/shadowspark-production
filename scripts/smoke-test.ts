import axios from "axios";

const BASE_URL = "https://shadowspark-tech.org";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function sendSlackStatus(success: boolean, message: string) {
  if (SLACK_WEBHOOK) {
    await axios.post(SLACK_WEBHOOK, {
      text: `${success ? "✅" : "❌"} *System Smoke Test:* ${message}`
    });
  }
}

async function runSmokeTest() {
  console.log("🚀 Starting System Smoke Test...");
  
  try {
    // 1. Lead Capture
    console.log("Step 1: Testing Lead Capture...");
    const contactRes = await axios.post(`${BASE_URL}/api/contact`, {
      name: "Smoke Test User",
      email: "smoke@test.com",
      company: "Smoke Test Corp",
      monthlyLeadVolume: "50-100"
    });
    if (contactRes.status !== 200) throw new Error("Lead capture API failed");

    // 2. Health Endpoint
    console.log("Step 2: Testing System Health...");
    const healthRes = await axios.get(`${BASE_URL}/api/ai/health`);
    if (healthRes.status !== 200 || healthRes.data.status !== "active") {
      throw new Error("Health check failed");
    }

    // 3. Operator Metrics
    console.log("Step 3: Testing Operator Dashboard API...");
    const metricsRes = await axios.get(`${BASE_URL}/api/operator/metrics`);
    // Note: This might return 401 if not authenticated, but we check if the endpoint exists
    if (metricsRes.status === 404) throw new Error("Operator metrics API missing");

    console.log("✅ Smoke Test Passed!");
    await sendSlackStatus(true, "All critical systems (Lead Capture, Health, Operator APIs) are responsive.");
  } catch (error: any) {
    console.error("❌ Smoke Test Failed:", error.message);
    await sendSlackStatus(false, `System failure detected during smoke test: ${error.message}`);
  }
}

runSmokeTest();
