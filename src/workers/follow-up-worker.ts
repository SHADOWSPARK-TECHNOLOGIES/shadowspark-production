import { prisma } from "@/lib/prisma";
import { sendOutreach } from "@/lib/email/send-outreach";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function processFollowUp(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  
  if (!lead || !lead.email) return { success: false, reason: "No lead or email" };

  // Skip if they are already converting
  const skipStatuses = ['WON', 'CONVERTED', 'demo_scheduled', 'QUALIFIED'];
  if (skipStatuses.includes(lead.status)) {
    return { success: false, reason: "Lead already in advanced stage" };
  }

  console.log(`[FOLLOW-UP] Processing lead: ${lead.email} (Score: ${lead.leadScore})`);

  try {
    const { text: emailBody } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      system: `You are ShadowWeaver, a senior infrastructure architect at ShadowSpark.
      Write a concise, high-conversion follow-up email to a lead who hasn't finalized their $10 system audit yet.
      
      RULES:
      - Max 3 sentences.
      - Acknowledge their initial interest.
      - Push the $10 system audit link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?leadId=${lead.id}&plan=audit
      - No corporate fluff. Be direct.
      - Sign off as "The ShadowSpark Team"`,
      prompt: `Lead info: Status is ${lead.status}, Tier is ${lead.tier}. Score is ${lead.leadScore}.`
    });

    const subject = `Your ShadowSpark System Audit`;

    await sendOutreach({
      leadId: lead.id,
      subject,
      body: emailBody
    });

    // Bump the next follow up by 48 hours
    await prisma.lead.update({
      where: { id: lead.id },
      data: { 
        nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      }
    });

    await prisma.systemEvent.create({
      data: {
        type: "FOLLOW_UP_SENT",
        message: `Automated follow-up sent to ${lead.email}`,
        metadata: { leadId: lead.id }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[FOLLOW-UP ERROR]", error);
    return { success: false, error };
  }
}

export async function recoverAbandonedCheckout(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  
  if (!lead || !lead.email) return { success: false, reason: "No lead or email" };

  if (lead.status === 'WON' || lead.status === 'CONVERTED') {
    return { success: false, reason: "Already paid" };
  }

  // Only recover High Intent / Enterprise
  if (lead.status !== 'HIGH_INTENT' && lead.tier !== 'enterprise') {
     return { success: false, reason: "Not high intent enough for recovery" };
  }

  console.log(`[RECOVERY] Firing abandoned checkout sequence for: ${lead.email}`);

  try {
    const subject = `Your ShadowSpark System Audit`;
    const body = `Your ShadowSpark audit slot is still reserved. Happy to walk you through the infrastructure assessment — just reply here if you have any questions.\n\nOtherwise, you can finalize the refundable deposit here: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${lead.id}\n\n— The ShadowSpark Team`;

    await sendOutreach({
      leadId: lead.id,
      subject,
      body
    });

    await prisma.systemEvent.create({
      data: {
        type: "RECOVERY_SENT",
        message: `Checkout recovery sent to ${lead.email}`,
        metadata: { leadId: lead.id }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[RECOVERY ERROR]", error);
    return { success: false, error };
  }
}
