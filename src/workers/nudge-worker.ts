import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sendPaymentLinkWhatsApp, sendTextWhatsApp } from "@/lib/whatsapp/send-payment-link";
import { WHATSAPP_NUDGE_QUEUE, type NudgeJobData } from "@/lib/whatsapp/nudge-queue";

const WORKER_NAME = "nudge-worker";

/**
 * Processes payment nudge jobs from the whatsapp-nudges queue.
 *
 * For each job:
 *   1. Verifies the lead is still in demo_scheduled status
 *   2. Sends the Paystack payment link via WhatsApp
 *   3. Logs a SystemEvent for audit trail
 */
export const nudgeWorker = new Worker<NudgeJobData>(
  WHATSAPP_NUDGE_QUEUE,
  async (job) => {
    const { leadId, phoneNumber, authorizationUrl, amountKobo, tier } = job.data;

    console.log(`[NudgeWorker] Processing nudge for lead ${leadId} (${phoneNumber})`);

    // 1. Verify lead is still in demo_scheduled status
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

    // 2. Extract first name from metadata for personalization
    const metadata = (lead.metadata ?? {}) as Record<string, unknown>;
    const miniAudit = metadata.miniAuditData as Record<string, unknown> | undefined;
    const firstName =
      typeof miniAudit?.companyName === "string"
        ? miniAudit.companyName.split(" ")[0]
        : undefined;

    // Format amount for display (kobo → NGN)
    const amountNgn = `₦${(amountKobo / 100).toLocaleString()}`;

    // 3. Send via WhatsApp
    // Try template first, fall back to plain text
    const templateResult = await sendPaymentLinkWhatsApp(phoneNumber, {
      firstName,
      amountNgn,
      tier: tier.charAt(0).toUpperCase() + tier.slice(1),
      authorizationUrl,
    });

    if (!templateResult.success) {
      // Fallback: send as plain text with preview_url enabled
      // Includes bank transfer fallback for Nigerian users who prefer transfers
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

    // 4. Log SystemEvent
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
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

nudgeWorker.on("completed", (job, result) => {
  console.log(`[NudgeWorker] Job ${job.id} completed:`, result);
});

nudgeWorker.on("failed", (job, err) => {
  console.error(`[NudgeWorker] Job ${job?.id} failed:`, err.message);
});
