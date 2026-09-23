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
      <h2 style="color: #FFFFFF;">Streamlining Compliance Review for ${businessName}</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        Under SEC Circular 26-1 and CBN AML/CFT Directives, handling transaction anomalies and KYC verification edge cases requires audit-grade precision without slowing customer onboarding.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        ShadowSpark provides a dedicated compliance control plane paired with AI-ASSIST: an advisory co-pilot that prepares sign-off-ready briefs in under two minutes while maintaining strict cryptographic tenant isolation and human-in-the-loop decision authority.
      </p>
      <a href="https://shadowspark-production.netlify.app/dashboard/reviews" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
        Schedule 10-Min Demo
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] SEC Circular 26-1 exception review architecture for ${businessName}`, html);
}

async function sendFollowUpEmail2(email: string, businessName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0A0A; color: #E4E4E7; border: 1px solid #27272A; border-radius: 12px;">
      <h2 style="color: #FFFFFF;">Audit-Ready Exception Triage & Non-Repudiation</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        Compliance officers at Nigerian digital lenders and VASPs spend hundreds of hours monthly manually reconciling identity velocity flags, BVN mismatches, and fiat-crypto narrative discrepancies.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        ShadowSpark eliminates this bottleneck by generating immutable non-repudiation audit trails ready for CBN and SEC regulatory inspection. Transparent local pricing (₦150,000/mo Starter or ₦450,000/mo Professional) applies after your 14-day zero-risk trial.
      </p>
      <a href="https://shadowspark-production.netlify.app/dashboard/reviews" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
        Explore Live Reviews Queue
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] Reducing exception triage overhead for ${businessName}`, html);
}

async function sendFollowUpEmail3(email: string, businessName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0A0A; color: #E4E4E7; border: 1px solid #27272A; border-radius: 12px;">
      <h2 style="color: #FFFFFF;">14-Day Guided Pilot Cohort Reservation</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #A1A1AA;">
        We have reserved a 14-day guided production pilot slot for ${businessName}.
      </p>
      <div style="background-color: #18181B; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #00E5FF;">
        <p style="color: #00E5FF; font-weight: bold; margin: 0;">PILOT INCLUSIONS</p>
        <p style="font-size: 14px; margin: 5px 0 0 0; color: #D4D4D8;">
          • Cryptographically isolated tenant sandbox<br/>
          • Pre-configured SEC Circular 26-1 & CBN AML rules<br/>
          • Live AI-ASSIST exception co-pilot with immutable audit logging<br/>
          • Zero financial risk: trial period with complete regulatory readiness
        </p>
      </div>
      <a href="https://shadowspark-production.netlify.app/dashboard/reviews" style="display: inline-block; background-color: #00E5FF; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Activate Pilot Cohort Slot
      </a>
    </div>
  `;

  await sendEmail(email, `[ShadowSpark] 14-Day Production Pilot reservation for ${businessName}`, html);
}

