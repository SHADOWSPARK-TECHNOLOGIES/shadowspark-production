import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sendPaymentLinkWhatsApp, sendTextWhatsApp } from "@/lib/whatsapp/send-payment-link";
import { WHATSAPP_NUDGE_QUEUE, type NudgeJobData } from "@/lib/whatsapp/nudge-queue";

/** Verifies, sends, and audits one payment nudge independently of BullMQ. */
export async function processNudgeJob(data: NudgeJobData) {
  const { leadId, phoneNumber, authorizationUrl, amountKobo, tier } = data;

  console.log(`[NudgeWorker] Processing nudge for lead ${leadId} (${phoneNumber})`);

  // Verify the lead still requires a payment nudge.
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true, email: true, metadata: true },
  });

  if (!lead) {
    console.warn(`[NudgeWorker] Lead ${leadId} not found, skipping`);
    return { skipped: true, reason: "lead_not_found" };
  }

  if (lead.status !== "demo_scheduled") {
    console.log(`[NudgeWorker] Lead ${leadId} status is '${lead.status}', skipping nudge`);
    return { skipped: true, reason: `status_${lead.status}` };
  }

  // Extract the display name used for personalization.
  const metadata = (lead.metadata ?? {}) as Record<string, unknown>;
  const miniAudit = metadata.miniAuditData as Record<string, unknown> | undefined;
  const firstName =
    typeof miniAudit?.companyName === "string"
      ? miniAudit.companyName.split(" ")[0]
      : undefined;

  const amountNgn = `₦${(amountKobo / 100).toLocaleString()}`;

  // Try the approved template first, then fall back to plain text.
  const templateResult = await sendPaymentLinkWhatsApp(phoneNumber, {
    firstName,
    amountNgn,
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    authorizationUrl,
  });

  if (!templateResult.success) {
    const text = `Hi ${firstName ?? "there"}! 👋

Your ShadowSpark demo is ready! 🚀

💳 *Pay Online (Instant)*
Pay ${amountNgn} (${tier} tier) → ${authorizationUrl}

🏦 *Bank Transfer Fallback*
Acct: 0123456789 (ShadowSpark Tech, Zenith Bank)
Ref: DEMO-${leadId.substring(0, 8).toUpperCase()}
Amount: ${amountNgn}
Reply "PAID" with screenshot → Instant approval.

Need help? Just reply to this message.`;

    const textResult = await sendTextWhatsApp(phoneNumber, text);
    if (!textResult.success) {
      console.error(`[NudgeWorker] Failed to send WhatsApp to ${phoneNumber}:`, textResult.error);
      return { sent: false, error: textResult.error };
    }
  }

  await prisma.systemEvent.create({
    data: {
      type: "PAYMENT_NUDGE_SENT",
      message: `Payment nudge sent to ${phoneNumber} for ${amountNgn} (${tier})`,
      metadata: {
        leadId,
        amountKobo,
        tier,
        authorizationUrl,
      },
    },
  });

  console.log(`[NudgeWorker] ✅ Payment nudge sent to ${phoneNumber}`);
  return { sent: true };
}

export const nudgeWorker = redis
  ? new Worker<NudgeJobData>(
      WHATSAPP_NUDGE_QUEUE,
      async (job) => processNudgeJob(job.data),
      {
        connection: redis,
        concurrency: 5,
      }
    )
  : null;

nudgeWorker?.on("completed", (job, result) => {
  console.log(`[NudgeWorker] Job ${job.id} completed:`, result);
});

nudgeWorker?.on("failed", (job, err) => {
  console.error(`[NudgeWorker] Job ${job?.id} failed:`, err.message);
});
