/**
 * Disbursement notification via WhatsApp.
 *
 * Called when a loan is approved/disbursed, sends the applicant a
 * personalised confirmation message via Twilio.
 */

import { prisma } from "@/lib/prisma";
import { sendLoanBotMessage } from "@/lib/whatsapp/loan-messaging";

export async function sendDisbursementNotification(
  loanApplicationId: string
): Promise<{ success: boolean; error?: string }> {
  const application = await prisma.loanApplication.findUnique({
    where: { id: loanApplicationId },
    select: {
      applicantName: true,
      phoneNumber: true,
      loanAmountKobo: true,
      purpose: true,
    },
  });

  if (!application) {
    return { success: false, error: "Loan application not found" };
  }

  const amountNgn = `₦${(Number(application.loanAmountKobo) / 100).toLocaleString("en-NG")}`;
  const firstName = application.applicantName.split(" ")[0];

  const message =
    `🎉 *Congratulations, ${firstName}!*\n\n` +
    `Your loan of *${amountNgn}* has been *approved and disbursed*! 💸\n\n` +
    `Purpose: ${application.purpose}\n\n` +
    `The funds will reflect in your account within *2 business hours*.\n\n` +
    `Repayment details will be sent to you shortly. ` +
    `Please ensure timely repayment to maintain your credit score.\n\n` +
    `Questions? Reply to this message or call 0800-SHADOWSPARK.`;

  return sendLoanBotMessage(application.phoneNumber, message);
}
