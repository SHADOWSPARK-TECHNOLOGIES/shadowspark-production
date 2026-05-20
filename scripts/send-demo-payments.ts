#!/usr/bin/env tsx
/**
 * send-demo-payments.ts
 *
 * One-time bulk-send script to initialize Paystack payments for all
 * demo_scheduled leads and deliver payment links via WhatsApp.
 *
 * Usage:
 *   pnpm tsx scripts/send-demo-payments.ts
 *
 * Environment variables required:
 *   DATABASE_URL          — PostgreSQL connection string
 *   PAYSTACK_SECRET_KEY   — Live Paystack secret key (or mock)
 *   META_ACCESS_TOKEN     — WhatsApp Cloud API access token
 *   META_PHONE_NUMBER_ID  — WhatsApp Business phone number ID
 *   NEXT_PUBLIC_APP_URL   — App base URL for callback
 *
 * Optional:
 *   LEAD_ID               — Process a single lead by ID (for testing)
 *   DRY_RUN               — Set to "true" to preview without sending
 */

import { prisma } from "../src/lib/prisma";
import { sendPaymentLinkWhatsApp, sendTextWhatsApp } from "../src/lib/whatsapp/send-payment-link";

const amounts: Record<string, number> = {
  starter: 149_00,
  pro: 349_00,
  enterprise: 599_00,
};

const tierDisplay: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

interface ProcessResult {
  leadId: string;
  phoneNumber: string | null;
  tier: string;
  amountKobo: number;
  paymentRef: string | null;
  paystackStatus: "initialized" | "mock" | "skipped" | "error";
  whatsappStatus: "sent" | "mock" | "skipped" | "error";
  error?: string;
}

async function initializePaystack(
  leadId: string,
  email: string | null,
  tier: string,
  amountKobo: number,
  demoSlug: string
): Promise<{
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  isMock: boolean;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const isMockMode = !secretKey || secretKey.startsWith("mock") || secretKey === "";

  if (isMockMode) {
    const reference = `demo_${leadId}_${Date.now()}`;
    const mockUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/checkout/success?reference=${reference}`;

    // Create pending Payment
    await prisma.payment.create({
      data: {
        amount: amountKobo,
        status: "pending",
        reference,
        leadId,
      },
    });

    // Save reference on lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { paymentRef: reference },
    });

    return {
      reference,
      authorizationUrl: mockUrl,
      accessCode: `mock_${leadId}`,
      isMock: true,
    };
  }

  // Real Paystack mode
  const emailAddr =
    email ?? `${leadId.substring(0, 8)}@shadowspark-demo.com`;

  const paystackResponse = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailAddr,
        amount: amountKobo,
        currency: "NGN",
        metadata: {
          leadId,
          demoSlug,
          tier,
          custom_fields: [
            {
              display_name: "Lead ID",
              variable_name: "leadId",
              value: leadId,
            },
            {
              display_name: "Demo Slug",
              variable_name: "demoSlug",
              value: demoSlug,
            },
          ],
        },
        channels: ["card", "bank_transfer", "ussd", "mobile_money"],
        callback_url: `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/checkout/success`,
      }),
    }
  );

  const data = await paystackResponse.json();

  if (!data.status) {
    throw new Error(data.message ?? "Paystack initialization failed");
  }

  // Save reference on lead
  await prisma.lead.update({
    where: { id: leadId },
    data: { paymentRef: data.data.reference },
  });

  // Create pending Payment record
  await prisma.payment.create({
    data: {
      amount: amountKobo,
      status: "pending",
      reference: data.data.reference,
      leadId,
    },
  });

  return {
    reference: data.data.reference,
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    isMock: false,
  };
}

async function sendWhatsAppNudge(
  phoneNumber: string,
  firstName: string | undefined,
  amountNgn: string,
  tier: string,
  authorizationUrl: string
): Promise<{ success: boolean; method: "template" | "text" | "skipped"; error?: string }> {
  // Try template first
  const templateResult = await sendPaymentLinkWhatsApp(phoneNumber, {
    firstName,
    amountNgn,
    tier,
    authorizationUrl,
  });

  if (templateResult.success) {
    return { success: true, method: "template" };
  }

  // Fallback to plain text
  const text = `Hi ${firstName ?? "there"}! 👋\n\nYour ShadowSpark demo is ready! 🚀\n\nTo unlock your full demo access (including API keys + live WhatsApp bot):\n\n💳 Pay ${amountNgn} (${tier} tier) → ${authorizationUrl}\n\nReply "PAID" after payment for instant approval.\n\nNeed help? Just reply to this message.`;

  const textResult = await sendTextWhatsApp(phoneNumber, text);

  if (textResult.success) {
    return { success: true, method: "text" };
  }

  return { success: false, method: "skipped", error: textResult.error };
}

async function main() {
  console.log("=== DEMO PAYMENT BULK-SEND SCRIPT ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  const isDryRun = process.env.DRY_RUN === "true";
  const singleLeadId = process.env.LEAD_ID;

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE — no payments or messages will be sent");
    console.log("");
  }

  // 1. Query leads
  const whereClause = singleLeadId
    ? { id: singleLeadId }
    : { status: "demo_scheduled" as const };

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: { demo: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${leads.length} lead(s) to process:\n`);

  if (leads.length === 0) {
    console.log("No leads to process. Exiting.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // Print summary table
  console.log(
    "ID".padEnd(28) +
      " | Phone".padEnd(16) +
      " | Tier".padEnd(14) +
      " | Demo".padEnd(10) +
      " | PaymentRef"
  );
  console.log("-".repeat(90));

  for (const lead of leads) {
    const config = (lead.demo?.config ?? {}) as Record<string, unknown>;
    const tier = (config.tier as string) ?? "starter";
    console.log(
      lead.id.padEnd(28) +
        " | " +
        (lead.phoneNumber ?? "N/A").padEnd(14) +
        " | " +
        tier.padEnd(12) +
        " | " +
        (lead.demo ? "✅" : "❌").padEnd(8) +
        " | " +
        (lead.paymentRef ?? "—")
    );
  }

  console.log("");
  console.log("=".repeat(90));
  console.log("");

  if (isDryRun) {
    console.log("Dry run complete. Set DRY_RUN=false to execute.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // 2. Process each lead
  const results: ProcessResult[] = [];

  for (const lead of leads) {
    console.log(`\n--- Processing lead ${lead.id} ---`);

    const config = (lead.demo?.config ?? {}) as Record<string, unknown>;
    const tier = (config.tier as string) ?? "starter";
    const amountKobo = amounts[tier] ?? 149_00;
    const demoSlug = lead.demo?.slug;

    const result: ProcessResult = {
      leadId: lead.id,
      phoneNumber: lead.phoneNumber,
      tier,
      amountKobo,
      paymentRef: lead.paymentRef,
      paystackStatus: "skipped",
      whatsappStatus: "skipped",
    };

    try {
      // Skip if already has paymentRef
      if (lead.paymentRef) {
        console.log(`  ⏭️  Already has paymentRef: ${lead.paymentRef}`);
        result.paystackStatus = "skipped";
        result.whatsappStatus = "skipped";
        results.push(result);
        continue;
      }

      // Skip if no Demo record
      if (!lead.demo) {
        console.log(`  ⏭️  No Demo record — run scheduleDemoForLead() first`);
        result.paystackStatus = "skipped";
        result.error = "no_demo_record";
        results.push(result);
        continue;
      }

      // 3. Initialize Paystack
      console.log(
        `  💳 Initializing Paystack: ${tierDisplay[tier] ?? tier} (₦${(amountKobo / 100).toLocaleString()})`
      );

      const { reference, authorizationUrl, isMock } = await initializePaystack(
        lead.id,
        lead.email,
        tier,
        amountKobo,
        demoSlug
      );

      result.paymentRef = reference;
      result.paystackStatus = isMock ? "mock" : "initialized";
      console.log(`  ✅ Paystack initialized: ref=${reference}`);
      console.log(`  🔗 URL: ${authorizationUrl}`);

      // 4. Send WhatsApp
      if (lead.phoneNumber) {
        // Extract first name from metadata
        const metadata = (lead.metadata ?? {}) as Record<string, unknown>;
        const miniAudit = metadata.miniAuditData as Record<string, unknown> | undefined;
        const firstName =
          typeof miniAudit?.companyName === "string"
            ? miniAudit.companyName.split(" ")[0]
            : undefined;

        const amountNgn = `₦${(amountKobo / 100).toLocaleString()}`;

        console.log(`  📱 Sending WhatsApp to ${lead.phoneNumber}...`);

        if (isMock) {
          // In mock mode, just log the URL
          console.log(`  📝 [MOCK] WhatsApp would send: ${authorizationUrl}`);
          result.whatsappStatus = "mock";
        } else {
          const whatsappResult = await sendWhatsAppNudge(
            lead.phoneNumber,
            firstName,
            amountNgn,
            tierDisplay[tier] ?? tier,
            authorizationUrl
          );

          if (whatsappResult.success) {
            result.whatsappStatus = "sent";
            console.log(`  ✅ WhatsApp sent via ${whatsappResult.method}`);
          } else {
            result.whatsappStatus = "error";
            result.error = whatsappResult.error;
            console.error(`  ❌ WhatsApp failed: ${whatsappResult.error}`);
          }
        }
      } else {
        console.log(`  ⏭️  No phone number, skipping WhatsApp`);
        result.whatsappStatus = "skipped";
      }

      // 5. Log SystemEvent
      await prisma.systemEvent.create({
        data: {
          type: "PAYMENT_NUDGE_SENT",
          message: `[Bulk Send] Payment nudge sent to ${lead.phoneNumber ?? "N/A"} for ${tierDisplay[tier] ?? tier} (₦${(amountKobo / 100).toLocaleString()})`,
          metadata: {
            leadId: lead.id,
            amountKobo,
            tier,
            reference,
            authorizationUrl,
            bulkSend: true,
          },
        },
      });
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      result.paystackStatus = "error";
      result.error = error instanceof Error ? error.message : String(error);
    }

    results.push(result);
  }

  // 6. Print summary
  console.log("\n" + "=".repeat(90));
  console.log("SUMMARY");
  console.log("=".repeat(90));

  const initialized = results.filter((r) => r.paystackStatus === "initialized" || r.paystackStatus === "mock").length;
  const sent = results.filter((r) => r.whatsappStatus === "sent" || r.whatsappStatus === "mock").length;
  const errors = results.filter((r) => r.paystackStatus === "error" || r.whatsappStatus === "error").length;

  console.log(`Total leads:     ${results.length}`);
  console.log(`Paystack init:   ${initialized}`);
  console.log(`WhatsApp sent:   ${sent}`);
  console.log(`Errors:          ${errors}`);

  if (errors > 0) {
    console.log("\nErrors:");
    for (const r of results.filter((r) => r.error)) {
      console.log(`  ❌ ${r.leadId}: ${r.error}`);
    }
  }

  console.log("\nDetailed results:");
  console.log(
    "Lead ID".padEnd(28) +
      " | Paystack".padEnd(14) +
      " | WhatsApp".padEnd(10) +
      " | Ref"
  );
  console.log("-".repeat(70));
  for (const r of results) {
    console.log(
      r.leadId.padEnd(28) +
        " | " +
        r.paystackStatus.padEnd(12) +
        " | " +
        r.whatsappStatus.padEnd(8) +
        " | " +
        (r.paymentRef ?? "—")
    );
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
