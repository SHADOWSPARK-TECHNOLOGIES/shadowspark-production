import { prisma } from "@/lib/prisma";
import { sendTextWhatsApp } from "@/lib/whatsapp/send-payment-link";
import type { LoanDisbursementJobData } from "@/lib/loans/disbursement-queue";

/** Sends and audits a loan disbursement notification without queue transport. */
export async function processLoanDisbursementNotification(data: LoanDisbursementJobData) {
  const result = await sendTextWhatsApp(
    data.applicantPhone,
    `Hello ${data.applicantName}, your loan of NGN ${data.amount} has been disbursed.`
  );
  if (!result.success) {
    throw new Error(result.error ?? "Loan disbursement notification failed");
  }

  await prisma.auditLog.create({
    data: {
      tenantId: data.tenantId,
      loanApplicationId: data.loanApplicationId,
      action: "LOAN_DISBURSEMENT_NOTIFICATION_SENT",
      metadata: { channel: "WHATSAPP", amount: data.amount },
    },
  });

  return { sent: true };
}
