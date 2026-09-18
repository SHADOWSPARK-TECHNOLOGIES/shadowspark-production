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

  const demoDepositAmountKobo = 1500000; // ₦15,000 in kobo per SHADOWSPARK_RULES.md
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
        amount: 1500000, // ₦15,000 in kobo per SHADOWSPARK_RULES.md
        status: "success",
        reference,
        leadId,
      }
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "PAID",
        demoApproved: true,
        paymentRef: reference,
      }
    });

    // Ensure Demo record exists for lead so /demo/[leadId] resolves immediately
    const existingDemo = await prisma.demo.findFirst({ where: { leadId } });
    if (!existingDemo) {
      await prisma.demo.create({
        data: {
          leadId,
          slug: leadId,
          approved: true,
          config: { tier: "SEMANTIC_GROWTH", plan: "audit" },
        },
      });
    } else {
      await prisma.demo.update({
        where: { id: existingDemo.id },
        data: { approved: true },
      });
    }

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
