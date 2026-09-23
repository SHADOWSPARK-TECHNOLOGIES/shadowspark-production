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
      system: `You are a senior compliance solutions architect at ShadowSpark.
      Write a concise, professional follow-up email to a financial institution compliance leader evaluating ShadowSpark for SEC Circular 26-1 and CBN compliance exception review.
      
      RULES:
      - Max 3 sentences.
      - Acknowledge their evaluation of automated compliance exception review and regulatory audit trails.
      - Invite them to schedule a 10-minute live demonstration or activate their 14-day guided pilot: ${process.env.NEXT_PUBLIC_APP_URL || 'https://shadowspark-production.netlify.app'}/dashboard/reviews
      - Professional, institutional B2B tone. No consumer fluff.
      - Sign off as "The ShadowSpark Compliance Team"`,
      prompt: `Lead info: Status is ${lead.status}, Tier is ${lead.tier}. Score is ${lead.leadScore}.`
    });

    const subject = `ShadowSpark: SEC Circular 26-1 Compliance Review & 14-Day Pilot`;

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
    const subject = `ShadowSpark: 14-Day Production Pilot Activation`;
    const body = `Your institution's 14-day ShadowSpark pilot environment reservation is ready. We can walk your compliance team through the SEC Circular 26-1 exception review queue and immutable audit trails — simply reply to this email to coordinate.\n\nYou can also review the live platform at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://shadowspark-production.netlify.app'}/dashboard/reviews\n\n— The ShadowSpark Compliance Team`;

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
