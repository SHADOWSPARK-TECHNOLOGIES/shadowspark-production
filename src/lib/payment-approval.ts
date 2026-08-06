import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueCrawl } from "@/lib/crawl/queue";

type MiniAuditData = {
  companyName?: string;
  rootUrl?: string;
  url?: string;
  website?: string;
};

function readMiniAuditData(value: Prisma.JsonValue | null | undefined): MiniAuditData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as MiniAuditData;
}

async function notifySlack(message: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url || url.includes("T00000000")) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}

/**
 * Approves a payment for a lead — the same logic used by the Paystack webhook
 * on charge.success. This is extracted so both the webhook AND the operator
 * "Force Approve" button share the exact same code path.
 *
 * Effects:
 *   - Payment record upserted to "success"
 *   - Lead.demoApproved = true, Lead.status = "PAID"
 *   - Demo.approved = true (creates Demo if missing)
 *   - Automated crawl enqueued (fire-and-forget)
 *   - Slack notification sent (fire-and-forget)
 *
 * @param leadId   The lead to approve
 * @param reference The payment reference (used for idempotency)
 * @param amount   The amount paid (in kobo for Paystack, or whatever unit the Payment record stores)
 * @param tier     The tier name for Slack notification
 * @param source   Label for logging ("webhook" | "operator_force_approve")
 */
export async function approvePayment(
  leadId: string,
  reference: string,
  amount: number,
  tier: string = "starter",
  source: "webhook" | "operator_force_approve" = "operator_force_approve"
) {
  // Idempotency check: if payment is already successful, skip
  const existingPayment = await prisma.payment.findFirst({
    where: { leadId, reference, status: "success" },
  });
  if (existingPayment) {
    console.log(`[PaymentApproval] Duplicate success for ${reference} (${source}), skipping`);
    return { status: "ok", note: "already_processed" };
  }

  const [payment, lead, demo] = await prisma.$transaction([
    prisma.payment.upsert({
      where: { reference },
      update: { status: "success" },
      create: {
        amount,
        status: "success",
        reference,
        leadId,
      },
    }),

    prisma.lead.update({
      where: { id: leadId },
      data: { demoApproved: true, status: "PAID" },
    }),

    prisma.demo.upsert({
      where: { leadId },
      update: { approved: true },
      create: {
        leadId,
        slug: `demo-${leadId}`,
        approved: true,
      },
    }),
  ]);

  // Fire-and-forget crawl trigger
  try {
    const audit = readMiniAuditData(lead.miniAuditData);
    const rootUrl = audit.rootUrl || audit.website || audit.url;

    if (rootUrl) {
      await enqueueCrawl({
        rootUrl,
        slug: demo.slug,
        limit: 20,
      });
      console.log(`[PaymentApproval] Crawl enqueued for ${rootUrl} (slug: ${demo.slug}) [${source}]`);
    } else {
      console.warn(`[PaymentApproval] No rootUrl for lead ${leadId}, skipping crawl [${source}]`);
    }
  } catch (crawlErr) {
    console.error(`[PaymentApproval] Crawl enqueue failed [${source}]:`, crawlErr);
  }

  // Fire-and-forget Slack notification
  const audit = readMiniAuditData(lead.miniAuditData);
  const amountDisplay = (amount / 100).toFixed(2);
  const sourceLabel = source === "operator_force_approve" ? " (Operator Force-Approved)" : "";
  notifySlack(
    `🚀 *New ShadowSpark Sale!${sourceLabel}*\n*Lead:* ${lead.phoneNumber}\n*Business:* ${audit.companyName || "Unknown"}\n*Amount:* $${amountDisplay} (${tier} tier)\n*Reference:* ${reference}\n*Approve now:* ${process.env.NEXTAUTH_URL || "https://shadowspark-tech.org"}/operator`
  );

  console.log(`[PaymentApproval] ✅ Payment ${reference} approved for lead ${leadId} [${source}]`);

  return { status: "ok" };
}
