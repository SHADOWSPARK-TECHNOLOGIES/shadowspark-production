
import { performance } from "perf_hooks";

const API_URL = process.env.TEST_API_URL || "https://shadowspark-v1-524469712746.europe-central2.run.app";
const SYNC_SECRET = process.env.LEAD_SYNC_SECRET || "sAwE5TDDOtXX6tN1gLo0/CGsqTqdAMM5hkpB8rZg7GM=";

async function testHealth() {
  console.log("Testing Health Endpoint...");
  const start = performance.now();
  try {
    const res = await fetch(`${API_URL}/api/ai/health`);
    const end = performance.now();
    const data = await res.json();
    return {
      status: res.status,
      data,
      latency: Math.round(end - start),
      ok: res.ok
    };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

async function testAuthFailure() {
  console.log("Testing Auth Failure (Lead Sync)...");
  try {
    const res = await fetch(`${API_URL}/api/leads/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-secret": "wrong-secret" },
      body: JSON.stringify({ phone: "123456" })
    });
    return {
      status: res.status,
      ok: res.status === 401
    };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

async function testAuthSuccess() {
  console.log("Testing Auth Success (Lead Sync)...");
  const start = performance.now();
  try {
    const res = await fetch(`${API_URL}/api/leads/sync`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-sync-secret": SYNC_SECRET 
      },
      body: JSON.stringify({ 
        phone: "+2348000000000",
        name: "Test Lead",
        businessType: "Testing",
        goals: "Validate API",
        source: "HealthCheckScript"
      })
    });
    const end = performance.now();
    const data = await res.json();
    return {
      status: res.status,
      data,
      latency: Math.round(end - start),
      ok: res.ok
    };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  const results = {
    health: await testHealth(),
    authFailure: await testAuthFailure(),
    authSuccess: await testAuthSuccess(),
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(results, null, 2));
}

runTests();
