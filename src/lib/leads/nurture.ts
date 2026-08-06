import { prisma } from "../prisma";
import { sendWelcomeEmail, sendEmail } from "../email";
import { Resend } from "resend";


export async function startNurtureSequence(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } }) as any;

  if (!lead || !(lead as any).email) {
    console.warn(`[Nurture] Cannot start sequence for lead ${leadId}: No email found.`);
    return;
  }

  console.log(`[Nurture] Starting sequence for lead ${leadId} (${lead.email})`);

  // Update lead status and set next follow up
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Follow up in 24 hours
      metadata: lead.metadata ? { ...(lead.metadata as any), nurtureStep: 1 } : { nurtureStep: 1 },
    },
  });

  // We could send Day 0 email here, but sendWelcomeEmail might be triggered elsewhere.
  // For now, we'll assume the nurture sequence starts *after* the initial welcome.
}

export async function processNurtureQueue() {
  const now = new Date();
  const filter: any = {
    nextFollowUpAt: { lte: now },
    email: { not: null },
  };
  const leadsToFollowUp = await prisma.lead.findMany({ where: filter });

  for (const lead of leadsToFollowUp) {
    await executeNurtureStep(lead);
  }
}

async function executeNurtureStep(lead: any) {
  const metadata = lead.metadata as any;
  const step = metadata?.nurtureStep || 1;
  const email = (lead as any).email!;
  const miniAudit = lead.miniAuditData as any;
  const businessName = lead.miniAuditData?.name || lead.miniAuditData?.companyName || "your business";

  console.log(`[Nurture] Executing step ${step} for lead ${lead.id}`);

  try {
    switch (step) {
      case 1:
        await sendFollowUpEmail1(email, businessName);
        await updateLeadNurture(lead.id, 2, 2 * 24); // Step 2 in 48 hours
        break;
      case 2:
        await sendFollowUpEmail2(email, businessName);
        await updateLeadNurture(lead.id, 3, 4 * 24); // Step 3 in 96 hours
        break;
      case 3:
        await sendFollowUpEmail3(email, businessName);
        await updateLeadNurture(lead.id, 4, null); // Done
        break;
      default:
        console.log(`[Nurture] Lead ${lead.id} has completed the sequence.`);
        await updateLeadNurture(lead.id, step, null);
    }
  } catch (error) {
    console.error(`[Nurture] Failed to execute step ${step} for lead ${lead.id}:`, error);
  }
}

async function updateLeadNurture(leadId: string, nextStep: number, hoursToWait: number | null) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: hoursToWait ? new Date(Date.now() + hoursToWait * 60 * 60 * 1000) : null,
      metadata: { nurtureStep: nextStep },
    },
  });
}

async function sendFollowUpEmail1(email: string, businessName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0A0A; color: #E4E4E7; border: 1px solid #27272A; border-radius: 12px;">
      <h2 style="color: #FFFFFF;">How is your audit, ${businessName}?</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        You recently ran a ShadowSpark audit. We've been analyzing your goals and the recommended architecture for your business.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        Do you have any questions about the suggested features or the deployment process?
      </p>
      <a href="https://shadowspark-tech.org/contact" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
        Talk to an Engineer
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] Your audit for ${businessName}`, html);
}

async function sendFollowUpEmail2(email: string, businessName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0A0A; color: #E4E4E7; border: 1px solid #27272A; border-radius: 12px;">
      <h2 style="color: #FFFFFF;">Closing the Revenue Gap</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        Most businesses lose 40-70% of leads due to slow response times. For ${businessName}, this could mean millions in leaked revenue.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        ShadowSpark's autonomous nodes ensure zero-wait qualification. Your system is ready for deployment.
      </p>
      <a href="https://shadowspark-tech.org/checkout/new" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
        Deploy Demo Environment
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] Scaling ${businessName} with AI`, html);
}

async function sendFollowUpEmail3(email: string, businessName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0A0A; color: #E4E4E7; border: 1px solid #27272A; border-radius: 12px;">
      <h2 style="color: #FFFFFF;">Special Activation Offer</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        We want to see ${businessName} thrive with sovereign AI infrastructure. 
      </p>
      <div style="background-color: #18181B; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #00E5FF;">
        <p style="color: #00E5FF; font-weight: bold; margin: 0;">PROMO CODE: ACTIVATION20</p>
        <p style="font-size: 14px; margin: 5px 0 0 0;">20% off your first 3 months of any Growth or Autonomous system.</p>
      </div>
      <a href="https://shadowspark-tech.org/checkout/new" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Claim Your Offer
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] Special offer for ${businessName}`, html);
}
