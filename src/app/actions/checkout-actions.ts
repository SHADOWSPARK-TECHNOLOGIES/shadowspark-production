"use server";
import { prisma } from "@/lib/prisma";

export async function processCheckout(leadId: string, data: { 
  companyName: string; 
  goal: string; 
  leadVolume: string;
  painPoint: string;
  packageId: string; 
  termsAccepted: boolean; 
}) {
  if (!data.termsAccepted) throw new Error("Terms must be accepted");

  const demoDepositAmountKobo = 100; // $1 Demo Deposit (in kobo)
  const demoDepositAmountUsd = 1;
  const mockPaystackLink = `https://checkout.paystack.com/test_${leadId}_${Date.now()}?amount=${demoDepositAmountKobo}`;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      termsAccepted: true,
      miniAuditData: {
        companyName: data.companyName,
        goal: data.goal,
        leadVolume: data.leadVolume,
        painPoint: data.painPoint,
        selectedPackage: data.packageId,
        demoDepositUsd: demoDepositAmountUsd,
        creditedToFinal: true
      },
      paymentRef: mockPaystackLink,
    }
  });

  return { paymentUrl: mockPaystackLink };
}

export async function getLeadForPayment(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { email: true, status: true }
  });
  if (!lead) throw new Error("Lead not found");
  return lead;
}

export async function verifyPayment(leadId: string, reference: string) {
  try {
    // Ideally verify via Paystack API using the reference here.
    // For now, we update the lead and record the payment.
    await prisma.payment.create({
      data: {
        amount: 100, // $1 Demo Deposit (in kobo)
        status: "success",
        reference,
        leadId,
      }
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "Paid - Awaiting Deployment",
        paymentRef: reference,
      }
    });

    await prisma.systemEvent.create({
      data: {
        type: "PAYMENT_SUCCESS",
        message: `Semantic Engine payment successful for lead ${leadId}`,
        metadata: { leadId, reference }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[VERIFY PAYMENT ERROR]:", error);
    return { success: false, error: "Failed to verify payment." };
  }
}
