"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendDisbursementNotification } from "@/lib/whatsapp/disbursement";
import { sendLoanBotMessage } from "@/lib/whatsapp/loan-messaging";

// ── Guards ────────────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approveLoan(
  loanApplicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();

    const application = await prisma.loanApplication.findUnique({
      where: { id: loanApplicationId },
    });

    if (!application) return { success: false, error: "Application not found" };
    if (application.status === "APPROVED") return { success: true }; // idempotent

    await prisma.loanApplication.update({
      where: { id: loanApplicationId },
      data: {
        status: "APPROVED",
        reviewedBy: session.user?.email ?? session.user?.name ?? "admin",
        reviewedAt: new Date(),
      },
    });

    // Send WhatsApp notification
    await sendDisbursementNotification(loanApplicationId);

    revalidatePath("/dashboard/loans");
    revalidatePath(`/dashboard/loans/${loanApplicationId}`);
    return { success: true };
  } catch (err) {
    console.error("[approveLoan]", err);
    return { success: false, error: "Failed to approve loan" };
  }
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectLoan(
  loanApplicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();

    if (!reason.trim()) return { success: false, error: "Rejection reason is required" };

    const application = await prisma.loanApplication.findUnique({
      where: { id: loanApplicationId },
    });
    if (!application) return { success: false, error: "Application not found" };

    await prisma.loanApplication.update({
      where: { id: loanApplicationId },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
        reviewedBy: session.user?.email ?? session.user?.name ?? "admin",
        reviewedAt: new Date(),
      },
    });

    // Notify applicant
    const firstName = application.applicantName.split(" ")[0];
    await sendLoanBotMessage(
      application.phoneNumber,
      `Hi ${firstName}, we regret to inform you that your ShadowSpark loan application has been *declined*.\n\n` +
        `Reason: ${reason.trim()}\n\n` +
        `You may re-apply after 30 days or contact support for assistance.`
    );

    revalidatePath("/dashboard/loans");
    revalidatePath(`/dashboard/loans/${loanApplicationId}`);
    return { success: true };
  } catch (err) {
    console.error("[rejectLoan]", err);
    return { success: false, error: "Failed to reject loan" };
  }
}

// ── Send WhatsApp ─────────────────────────────────────────────────────────────

export async function sendWhatsAppMessage(
  loanApplicationId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSession();

    if (!message.trim()) return { success: false, error: "Message cannot be empty" };

    const application = await prisma.loanApplication.findUnique({
      where: { id: loanApplicationId },
      select: { phoneNumber: true },
    });

    if (!application) return { success: false, error: "Application not found" };

    return sendLoanBotMessage(application.phoneNumber, message.trim());
  } catch (err) {
    console.error("[sendWhatsAppMessage]", err);
    return { success: false, error: "Failed to send message" };
  }
}
