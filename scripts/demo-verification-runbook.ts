/**
 * Live Demo Verification Suite — Executes Demo Runbook (docs/DEMO_RUNBOOK.md)
 * 
 * Verifies live production health for every step of the 5-to-10 minute customer demo:
 * 1. Part 2: Public marketing & conversion pages (/, /pricing, /contact, /faq)
 * 2. Part 3: Auth security & fail-closed RBAC boundary (/dashboard -> 302 /login)
 * 3. Part 4: Compliance Review Queue unauthenticated (401)
 * 4. Part 5: AI-ASSIST Advisory connectivity & upstream health
 */

interface StepResult {
  step: string;
  url: string;
  expectedStatus: number;
  actualStatus: number;
  durationMs: number;
  passed: boolean;
  notes: string;
}

const BASE_URL = "https://shadowspark-production.netlify.app";
const AI_URL = "https://shadowspark-ai-api.onrender.com";

async function verifyStep(
  step: string,
  url: string,
  expectedStatus: number,
  redirect: RequestRedirect = "manual"
): Promise<StepResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect });
    const durationMs = Date.now() - start;
    const passed = res.status === expectedStatus;
    let notes = `HTTP ${res.status}`;
    if (res.status === 302 || res.status === 307) {
      notes += ` -> Location: ${res.headers.get("location") ?? "unknown"}`;
    }
    return {
      step,
      url,
      expectedStatus,
      actualStatus: res.status,
      durationMs,
      passed,
      notes,
    };
  } catch (err: any) {
    return {
      step,
      url,
      expectedStatus,
      actualStatus: 0,
      durationMs: Date.now() - start,
      passed: false,
      notes: `Error: ${err.message}`,
    };
  }
}

async function main() {
  console.log("============================================================");
  console.log("SHADOWSPARK LIVE DEMO RUNBOOK EXECUTION TEST");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Upstream AI: ${AI_URL}`);
  console.log("============================================================\n");

  const steps: StepResult[] = [];

  // Part 2: Public pages
  steps.push(await verifyStep("Part 2.1: Landing Page", `${BASE_URL}/`, 200));
  steps.push(await verifyStep("Part 2.2: Pricing Tier Table", `${BASE_URL}/pricing`, 200));
  steps.push(await verifyStep("Part 2.3: Contact / Lead Form", `${BASE_URL}/contact`, 200));
  steps.push(await verifyStep("Part 2.4: Regulatory FAQ", `${BASE_URL}/faq`, 200));

  // Part 3: Auth Security Boundary
  steps.push(await verifyStep("Part 3.1: Edge Auth Guard (/dashboard)", `${BASE_URL}/dashboard`, 302));
  steps.push(await verifyStep("Part 3.2: Login Page Render", `${BASE_URL}/login`, 200));

  // Part 4: Compliance Review Guard
  steps.push(
    await verifyStep(
      "Part 4.1: Review Queue Fail-Closed API",
      `${BASE_URL}/api/compliance/reviews`,
      401
    )
  );

  // Part 5: AI-ASSIST Connectivity
  steps.push(
    await verifyStep(
      "Part 5.1: Live AI-ASSIST Integration Gateway",
      `${BASE_URL}/api/ai/health`,
      200
    )
  );
  steps.push(
    await verifyStep(
      "Part 5.2: Upstream Render Service Health",
      `${AI_URL}/healthz`,
      200
    )
  );

  let allPassed = true;
  for (const s of steps) {
    const icon = s.passed ? "✅" : "❌";
    console.log(`${icon} [${s.step}]`);
    console.log(`   URL: ${s.url}`);
    console.log(`   Expected: ${s.expectedStatus} | Actual: ${s.actualStatus} | ${s.durationMs}ms`);
    console.log(`   Notes: ${s.notes}\n`);
    if (!s.passed) allPassed = false;
  }

  console.log("============================================================");
  if (allPassed) {
    console.log("🎉 ALL DEMO RUNBOOK STOPS VERIFIED GREEN LIVE IN PRODUCTION.");
    console.log("System is 100% ready for prospective customer walkthrough.");
  } else {
    console.error("❌ DEMO RUNBOOK FAILED ON ONE OR MORE STOPS.");
    process.exit(1);
  }
  console.log("============================================================");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
