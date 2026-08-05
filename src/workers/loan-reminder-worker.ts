/**
 * Loan Reminder Worker
 *
 * Processes jobs from the "loan-reminders" BullMQ queue.
 * Sends payment due / overdue / final notice WhatsApp messages.
 *
 * Respects Nigeria quiet hours (22:00–07:00 WAT = UTC+1).
 * If a job fires during quiet hours it is delayed 1 hour and requeued.
 *
 * Run standalone: tsx src/workers/loan-reminder-worker.ts
 */

import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sendLoanBotMessage } from "@/lib/whatsapp/loan-messaging";
import {
  LOAN_REMINDER_QUEUE,
  type LoanReminderJobData,
  enqueueLoanReminder,
} from "@/lib/whatsapp/loan-reminder-queue";

const WORKER_NAME = "loan-reminder-worker";

// Nigeria is UTC+1 (WAT). Quiet hours: 22:00–07:00 WAT.
function isNigeriaQuietHours(): boolean {
  const nowWat = new Date(Date.now() + 60 * 60 * 1000); // shift to WAT
  const hour = nowWat.getUTCHours();
  return hour >= 22 || hour < 7;
}

function buildReminderMessage(data: LoanReminderJobData): string {
  const firstName = data.applicantName.split(" ")[0];
  const amountNgn = `₦${(data.amountKobo / 100).toLocaleString("en-NG")}`;

  switch (data.reminderType) {
    case "PAYMENT_DUE":
      return (
        `Hi ${firstName} 👋, this is a friendly reminder from *ShadowSpark Loans*.\n\n` +
        `Your loan repayment of *${amountNgn}* is *due today*. ` +
        `Please make payment to avoid late charges.\n\n` +
        `Reply HELP for payment options.`
      );

    case "OVERDUE":
      return (
        `⚠️ *Urgent: Overdue Payment*\n\n` +
        `Hi ${firstName}, your ShadowSpark loan repayment of *${amountNgn}* is now *overdue*.\n\n` +
        `Please pay immediately to avoid penalties and protect your credit score.\n\n` +
        `Reply HELP to speak with our recovery team.`
      );

    case "FINAL_NOTICE":
      return (
        `🚨 *FINAL NOTICE — ${firstName}*\n\n` +
        `This is the final reminder regarding your outstanding loan repayment of *${amountNgn}*.\n\n` +
        `Failure to pay within 48 hours will result in escalation to our legal and credit bureau team.\n\n` +
        `Reply NOW to resolve this immediately.`
      );

    default:
      return (
        `Hi ${firstName}, please remember your ShadowSpark loan repayment of *${amountNgn}* is due. ` +
        `Reply HELP for assistance.`
      );
  }
}

export const loanReminderWorker = new Worker<LoanReminderJobData>(
  LOAN_REMINDER_QUEUE,
  async (job) => {
    const data = job.data;

    console.log(
      `[${WORKER_NAME}] Processing reminder ${data.reminderId} (${data.reminderType}) for ${data.phoneNumber}`
    );

    // Respect quiet hours: delay 1 hour and requeue
    if (isNigeriaQuietHours()) {
      console.log(`[${WORKER_NAME}] Quiet hours — delaying 1 hour`);
      const sendAt = new Date(Date.now() + 60 * 60 * 1000);
      await enqueueLoanReminder(data, sendAt);
      return { skipped: true, reason: "quiet_hours", requeued: true };
    }

    // Verify application still active
    const application = await prisma.loanApplication.findUnique({
      where: { id: data.applicationId },
      select: { status: true },
    });

    if (!application) {
      console.warn(`[${WORKER_NAME}] Application ${data.applicationId} not found`);
      return { skipped: true, reason: "application_not_found" };
    }

    // Skip reminders for closed loans
    if (["REJECTED", "DISBURSED"].includes(application.status) === false &&
        application.status !== "APPROVED") {
      console.log(
        `[${WORKER_NAME}] Application ${data.applicationId} status=${application.status}, skipping`
      );
      return { skipped: true, reason: `status_${application.status}` };
    }

    const message = buildReminderMessage(data);
    const result = await sendLoanBotMessage(data.phoneNumber, message);

    if (!result.success) {
      console.error(`[${WORKER_NAME}] Failed to send to ${data.phoneNumber}:`, result.error);
      throw new Error(`WhatsApp send failed: ${result.error}`);
    }

    // Mark reminder as sent
    await prisma.loanReminder.update({
      where: { id: data.reminderId },
      data: { sentAt: new Date() },
    });

    console.log(`[${WORKER_NAME}] ✅ Reminder sent (${data.reminderType}) to ${data.phoneNumber}`);
    return { sent: true, messageSid: result.messageSid };
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

loanReminderWorker.on("completed", (job, result) => {
  console.log(`[${WORKER_NAME}] Job ${job.id} completed:`, result);
});

loanReminderWorker.on("failed", (job, err) => {
  console.error(`[${WORKER_NAME}] Job ${job?.id} failed:`, err.message);
});

console.log(`[${WORKER_NAME}] Started — listening for loan reminders`);
