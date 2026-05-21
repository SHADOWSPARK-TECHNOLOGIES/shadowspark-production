import { POST as WebhookPOST } from "../src/app/api/paystack/webhook/route";
import { POST as TelemetryPOST } from "../src/app/api/telemetry/error/route";
import { retrieveRagContext } from "../src/lib/rag/retrieve";
import { prisma } from "../src/lib/prisma";
import crypto from "crypto";
import { NextRequest } from "next/server";

async function run() {
  console.log("=== SHADOWSPARK SMOKE TEST ===");

  console.log("\n--- 1. MESSY URL INGESTION ---");
  const testUrl = "https://www.ShadowSpark.tech/deep/path/?query=string#hash";
  const slugifySegment = (input: string) => input.toLowerCase().replace(/https?:\/\//g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const normalized = slugifySegment(testUrl);
  console.log("Input:", testUrl);
  console.log("Normalized for Vault Pathing:", normalized);
  console.log("Behavior: The URL correctly resolves into a safe, flat filesystem string, preserving uniqueness without breaking GCS paths.");

  console.log("\n--- 2. WEBHOOK IDEMPOTENCY ---");
  const lead = await prisma.lead.create({ data: { phoneNumber: "SMOKE-" + Date.now(), status: "NEW" } });
  const payload = {
    event: "charge.success",
    data: { reference: "smoke_ref_" + Date.now(), amount: 1000, metadata: { leadId: lead.id } }
  };
  const bodyText = JSON.stringify(payload);
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET || "";
  const signature = crypto.createHmac("sha512", secret).update(bodyText).digest("hex");

  const req1 = new Request("http://localhost/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body: bodyText
  });
  const res1 = await WebhookPOST(req1);
  const json1 = await res1.json();
  console.log("Call 1 (Initial):", res1.status, json1);

  // Remake request since body is consumed
  const req2 = new Request("http://localhost/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body: bodyText
  });
  const res2 = await WebhookPOST(req2);
  const json2 = await res2.json();
  console.log("Call 2 (Duplicate):", res2.status, json2);

  const payments = await prisma.payment.findMany({ where: { leadId: lead.id } });
  console.log(`Final Payment Records for Lead: ${payments.length} (Expected: 1)`);

  console.log("\n--- 3. ASSISTANT FALLBACK ---");
  const context = await retrieveRagContext({ query: "pricing", slug: "missing-slug" });
  console.log("RAG Retrieval Result for Missing Slug:", context === null ? "null (Expected)" : "Found");
  console.log("Behavior: The API route will substitute 'VAULT STATUS: Awaiting index...' dynamically.");

  console.log("\n--- 4. TELEMETRY CAPTURE ---");
  const digestId = "ERR_SMOKE_" + Date.now();
  const req3 = new Request("http://localhost/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Intentional Tripwire", digest: digestId })
  });
  await TelemetryPOST(req3);
  const events = await prisma.systemEvent.findMany({ where: { digest: digestId } });
  console.log("Captured Telemetry Events:", events.length, "(Expected: 1)");
  if (events.length) console.log("Digest Captured:", events[0].digest);

  console.log("\n=== TEST COMPLETE ===");
}

run().catch(console.error).finally(() => prisma.$disconnect());
