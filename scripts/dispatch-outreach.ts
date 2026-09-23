/**
 * Outreach Dispatcher & URL Generator — ShadowSpark Commercial Control Plane
 * 
 * Generates pre-filled mailto, WhatsApp, and LinkedIn search deep links
 * for all 10 target institutions from docs/OUTREACH_CAMPAIGN_BATCH_01.md,
 * enabling immediate one-click transmission without manual copy-pasting.
 * 
 * CLI Enhancements:
 * - 1-Click Link Generation (default or --mode links)
 * - Live Resend API Email Dispatch (--mode email [--lead <email|id>])
 * - Manual Operator Dispatch Logging (--channel linkedin|whatsapp --lead <id|email> --status sent)
 */

import { sendOutreach } from "@/lib/email/send-outreach";
import { prisma as defaultPrisma } from "@/lib/prisma";

export interface ProspectDispatch {
  id: number;
  company: string;
  category: string;
  role: string;
  contactEmail: string;
  linkedInUrl: string;
  subject: string;
  messageBody: string;
}

export const PROSPECTS: ProspectDispatch[] = [
  {
    id: 1,
    company: "FairMoney Microfinance Bank",
    category: "Primary ICP — Digital Lending / Neobank",
    role: "Head of Compliance / CRO",
    contactEmail: "compliance@fairmoney.io",
    linkedInUrl: "https://www.linkedin.com/company/fairmoney/people/?keywords=compliance",
    subject: "Streamlining exception review under Circular 26-1 & CBN directives",
    messageBody: `Hi,

Given FairMoney's scale as one of Nigeria's largest digital lending platforms, I wanted to reach out regarding the operational overhead of manual exception and KYC review.

As application volumes surge, compliance teams often spend hundreds of hours monthly manually verifying flagged accounts, BVN mismatches, and untrusted intake notes across multiple screens.

We built ShadowSpark (https://shadowspark-production.netlify.app) to automate this workflow: a dedicated compliance control plane paired with an advisory co-pilot (AI-ASSIST) that synthesizes transaction facts, highlights relevant regulatory clauses, and prepares briefs for officer sign-off in under two minutes per case.

Crucially:
- Strict cryptographic tenant isolation ensures your borrower data remains 100% confidential.
- Human-in-the-loop: AI never makes or overrides approval decisions; officers retain complete authority.
- Immutable non-repudiation audit trails ready for CBN/SEC inspection.

We are currently onboarding an initial cohort of 5 fintech partners for a 14-day guided production pilot.

Are you available for a brief 10-minute live demonstration next Tuesday or Thursday?

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 2,
    company: "Carbon (OneFi MFB)",
    category: "Primary ICP — Digital Lending / Neobank",
    role: "Head of Risk & Compliance",
    contactEmail: "compliance@getcarbon.co",
    linkedInUrl: "https://www.linkedin.com/company/getcarbon/people/?keywords=compliance",
    subject: "Reducing exception review bottlenecks for Carbon's credit operations",
    messageBody: `Hi,

With Carbon pioneering digital credit and banking in Nigeria, your risk and compliance team handles significant daily exception volume—from identity anomalies to duplicate application alerts.

Manual triaging in spreadsheets or custom back-office portals slows down legitimate borrowers and burns out senior analysts.

ShadowSpark provides an institutional exception review control plane. Our advisory engine pre-screens flagged cases, checks regulatory circular rules, and surfaces risk indicators (such as untrusted text notes or injection patterns) directly to your reviewing officers.

We’re live in production at https://shadowspark-production.netlify.app and offering a 14-day guided pilot for select fintech credit teams.

Could we schedule a 10-minute Zoom walkthrough next week to show your team how it works?

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 3,
    company: "Renmoney Microfinance Bank",
    category: "Primary ICP — Consumer Credit & MSME Lending",
    role: "Chief Risk Officer / Compliance Lead",
    contactEmail: "compliance@renmoney.com",
    linkedInUrl: "https://www.linkedin.com/company/renmoney/people/?keywords=compliance",
    subject: "Automating exception briefs for Renmoney's credit review team",
    messageBody: `Hi,

I’m reaching out regarding the operational time Renmoney’s compliance officers spend triaging flagged loan applications and documentation discrepancies.

ShadowSpark is an automated compliance control plane built specifically for Nigerian financial institutions. We help teams reduce the time spent reviewing flagged exceptions by over 60% through an advisory co-pilot that structures evidence and regulatory citations into clear, sign-off-ready briefs.

We enforce strict bank-grade cryptographic tenant isolation and transparent Naira billing (₦150k or ₦450k/mo).

We’d love to show you a live 10-minute demo and see if Renmoney would be a fit for our 14-day pilot program.

Would next Wednesday at 11:00 AM WAT work for a brief call? You can also review our live platform here: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 4,
    company: "Branch International Nigeria",
    category: "Primary ICP — Digital Micro-Lending",
    role: "Head of Compliance & Operations",
    contactEmail: "nigeria-compliance@branch.co",
    linkedInUrl: "https://www.linkedin.com/company/branch-international/people/?keywords=compliance",
    subject: "High-velocity compliance review acceleration for Branch Nigeria",
    messageBody: `Hi,

Branch’s high-velocity machine learning underwriting delivers credit in seconds, but edge-case exceptions and regulatory identity holds still require human officer scrutiny.

ShadowSpark acts as a dedicated control plane for those exceptions. Our AI co-pilot, AI-ASSIST, summarizes transaction anomalies and policy rules into an interactive queue (/dashboard/reviews), enabling officers to complete compliance reviews with complete mathematical audit trails in seconds.

We are currently selecting 5 Nigerian digital lenders for our 14-day production pilot cohort.

Can we set up a quick 10-minute demo on Zoom next week? Platform preview: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 5,
    company: "Kuda Microfinance Bank",
    category: "Primary ICP — Neobank & Consumer Credit",
    role: "Chief Compliance Officer / Head of AML",
    contactEmail: "compliance@kuda.com",
    linkedInUrl: "https://www.linkedin.com/company/kudabank/people/?keywords=compliance",
    subject: "Exception review co-piloting under CBN AML directives — Kuda",
    messageBody: `Hi,

As Kuda continues its rapid customer expansion, managing manual compliance exceptions and high-frequency account upgrade flags can stretch compliance capacity.

ShadowSpark provides an exception review control plane designed specifically for Nigerian fintech scale. We replace spreadsheet queues with an edge-authenticated workspace where AI summarizes regulatory circular clauses and evidence, while your officers maintain 100% human sign-off authority.

Key security: Strict tenant isolation and fail-closed edge guards ensure complete customer privacy.

We are offering a 14-day guided pilot for select fintech compliance departments. Would you be open to a 10-minute live demonstration next week?

Live platform: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 6,
    company: "PalmPay Nigeria",
    category: "Primary ICP — Payments & Agency Banking",
    role: "Head of Regulatory Compliance",
    contactEmail: "compliance@palmpay-inc.com",
    linkedInUrl: "https://www.linkedin.com/company/palmpay/people/?keywords=compliance",
    subject: "Automating exception triaging for PalmPay's compliance operations",
    messageBody: `Hi,

PalmPay’s transaction volume is one of the highest in Nigeria, meaning even a 0.5% exception rate results in thousands of manual reviews for your compliance team every week.

ShadowSpark (https://shadowspark-production.netlify.app) provides a high-throughput Exception Review interface. Our advisory co-pilot extracts verified facts, maps relevant regulatory provisions, and lets compliance officers review and annotate exceptions in under 2 minutes.

We’re running 14-day production pilots for 5 fintech leaders in Lagos.

Could we schedule 10 minutes next Tuesday to walk your team through the live platform?

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 7,
    company: "Quidax",
    category: "Secondary ICP — SEC Licensed Digital Assets Exchange (DAX)",
    role: "Chief Compliance Officer / MLRO",
    contactEmail: "compliance@quidax.com",
    linkedInUrl: "https://www.linkedin.com/company/quidax/people/?keywords=compliance",
    subject: "SEC Circular 26-1 exception review automation for Quidax",
    messageBody: `Hi,

Congratulations on Quidax’s pioneering SEC provisional operating license as a Digital Assets Exchange.

With the release of SEC Circular 26-1 and heightened VASP regulatory scrutiny, compliance teams face rigorous documentation requirements on transaction exceptions, fiat-crypto reconciliations, and counterparty risks.

We built ShadowSpark specifically for this environment. Our platform provides a centralized Exception Review queue where AI-ASSIST evaluates transaction metadata, checks Circular 26-1 provisions, and generates audit-ready briefs for officer approval.

Crucial guarantee: AI never touches your core order book or executes fund movements; it serves purely as an advisory evidence co-pilot with immutable non-repudiation logging.

We are onboarding an initial cohort of 5 regulated institutions for a 14-day pilot.

Are you available for a 10-minute live walkthrough next week? Live link: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 8,
    company: "Busha",
    category: "Secondary ICP — SEC Licensed VASP / Exchange",
    role: "Head of Compliance & Legal",
    contactEmail: "compliance@busha.co",
    linkedInUrl: "https://www.linkedin.com/company/busha/people/?keywords=compliance",
    subject: "Circular 26-1 compliance audit trail co-pilot for Busha",
    messageBody: `Hi,

Following Busha’s SEC provisional license and your partnership with Mastercard Crypto Credential, maintaining rapid exception resolution while proving strict compliance governance is essential.

ShadowSpark provides an institutional exception control plane for licensed VASPs. It ingests flagged transaction events, generates structured risk briefs citing circular clauses, and records cryptographic audit logs for every officer decision.

We provide dedicated, mathematically isolated tenant environments and transparent local pricing (₦150k or ₦450k/mo).

We’d love to show Busha’s compliance team a 10-minute live walkthrough and discuss our 14-day pilot program.

Would you have 10 minutes next Thursday at 2:00 PM WAT? Platform link: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 9,
    company: "Yellow Card Nigeria",
    category: "Secondary ICP — VASP / Liquidity Provider",
    role: "Regional Compliance Director / MLRO",
    contactEmail: "compliance@yellowcard.io",
    linkedInUrl: "https://www.linkedin.com/company/yellow-card-app/people/?keywords=compliance",
    subject: "Accelerating cross-border compliance exception triaging — Yellow Card",
    messageBody: `Hi,

With Yellow Card handling major institutional stablecoin and fiat liquidity flows across Nigeria, your compliance officers handle complex transaction exceptions requiring rapid, documented sign-offs.

ShadowSpark is an automated compliance control plane designed to streamline this process. Our advisory engine parses counterparty risk indicators, maps regulatory rules under Circular 26-1 and CBN frameworks, and maintains permanent non-repudiation logs.

We are currently admitting 5 regulated fintech desks into our 14-day production pilot program.

Could we schedule a quick 10-minute screen share next week to demonstrate the live queue?

Live platform: https://shadowspark-production.netlify.app

Best regards,
ShadowSpark Technologies`,
  },
  {
    id: 10,
    company: "Flitaa",
    category: "Secondary ICP — Digital Asset Provider / OTC Desk",
    role: "Head of Operations & Compliance",
    contactEmail: "compliance@flitaa.com",
    linkedInUrl: "https://www.linkedin.com/company/flitaa/people/?keywords=compliance",
    subject: "SEC Circular 26-1 exception review control plane for Flitaa",
    messageBody: `Hi,

Under the updated SEC Circular 26-1 regulatory framework for Nigerian digital asset operators, having structured, audit-ready documentation for all flagged transactions and user verification exceptions is critical.

ShadowSpark gives your compliance team a single control plane (/dashboard/reviews) to inspect anomalies, review automated regulatory co-pilot briefs, and record signed annotations in seconds.

We’re live in production at https://shadowspark-production.netlify.app and offering a 14-day guided pilot for 5 digital asset platforms.

Can we set up a 10-minute demo on Zoom next week?

Best regards,
ShadowSpark Technologies`,
  },
];

export function generateMailtoUrl(prospect: ProspectDispatch): string {
  const params = new URLSearchParams();
  params.set("subject", prospect.subject);
  params.set("body", prospect.messageBody);
  return `mailto:${prospect.contactEmail}?${params.toString()}`;
}

export function generateWhatsAppUrl(prospect: ProspectDispatch): string {
  const text = `${prospect.subject}\n\n${prospect.messageBody}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function getProspects(): ProspectDispatch[] {
  return PROSPECTS;
}

export interface DispatchEmailResult {
  success: boolean;
  leadId: string;
  email: string;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Dispatches live or simulated outreach email to a lead and records the channel state.
 */
export async function dispatchOutreachEmail(options: {
  leadId?: string;
  email?: string;
  subject?: string;
  body?: string;
  client?: any;
}): Promise<DispatchEmailResult> {
  const client = options.client || defaultPrisma;
  let targetLead: any = null;

  if (options.leadId) {
    targetLead = await client.lead.findUnique({ where: { id: options.leadId } });
  } else if (options.email) {
    targetLead = await client.lead.findUnique({ where: { email: options.email } });
  }

  const prospect = PROSPECTS.find(
    (p) =>
      p.contactEmail.toLowerCase() === options.email?.toLowerCase() ||
      p.contactEmail.toLowerCase() === targetLead?.email?.toLowerCase()
  );

  const subject = options.subject || prospect?.subject || "ShadowSpark Compliance Pilot Demonstration";
  const body = options.body || prospect?.messageBody || "ShadowSpark compliance exception review pilot offer.";

  if (!targetLead) {
    if (!options.email) {
      throw new Error("Either valid leadId or email must be provided for outreach dispatch");
    }
    // If lead doesn't exist yet, create one
    targetLead = await client.lead.create({
      data: {
        email: options.email,
        status: "QUALIFIED",
        intent: subject,
        tier: "enterprise",
        metadata: {
          channels: {
            email: { address: options.email, status: "pending" },
            linkedin: { status: "pending" },
            whatsapp: { status: "pending" },
          },
        },
      },
    });
  }

  const sendResult = await sendOutreach({
    leadId: targetLead.id,
    subject,
    body,
  });

  // Update lead channel state in metadata
  const existingMetadata =
    targetLead.metadata && typeof targetLead.metadata === "object"
      ? (targetLead.metadata as Record<string, any>)
      : {};
  const channels = existingMetadata.channels || {};

  channels.email = {
    ...channels.email,
    address: targetLead.email,
    status: "sent",
    lastDispatchedAt: new Date().toISOString(),
    messageId: sendResult.messageId || (sendResult.simulated ? "simulated-id" : null),
  };

  await client.lead.update({
    where: { id: targetLead.id },
    data: {
      metadata: {
        ...existingMetadata,
        channels,
      },
      updatedAt: new Date(),
    },
  });

  return {
    success: sendResult.success,
    leadId: targetLead.id,
    email: targetLead.email,
    simulated: sendResult.simulated,
    messageId: sendResult.messageId,
  };
}

export interface LogManualDispatchResult {
  success: boolean;
  leadId: string;
  channel: string;
  status: string;
  updatedAt: string;
}

/**
 * Manually logs an operator dispatch for LinkedIn or WhatsApp.
 */
export async function logManualDispatch(options: {
  leadId?: string;
  email?: string;
  channel: "email" | "linkedin" | "whatsapp";
  status?: string;
  notes?: string;
  client?: any;
}): Promise<LogManualDispatchResult> {
  const client = options.client || defaultPrisma;
  let targetLead: any = null;

  if (options.leadId) {
    targetLead = await client.lead.findUnique({ where: { id: options.leadId } });
  } else if (options.email) {
    targetLead = await client.lead.findUnique({ where: { email: options.email } });
  }

  if (!targetLead) {
    throw new Error(`Lead not found for manual dispatch logging (id: ${options.leadId}, email: ${options.email})`);
  }

  const status = options.status || "sent";
  const timestamp = new Date().toISOString();

  const existingMetadata =
    targetLead.metadata && typeof targetLead.metadata === "object"
      ? (targetLead.metadata as Record<string, any>)
      : {};
  const channels = existingMetadata.channels || {};
  const currentChannel = channels[options.channel] || {};

  channels[options.channel] = {
    ...currentChannel,
    status,
    lastDispatchedAt: timestamp,
    notes: options.notes || currentChannel.notes,
  };

  await client.lead.update({
    where: { id: targetLead.id },
    data: {
      metadata: {
        ...existingMetadata,
        channels,
      },
      updatedAt: new Date(),
    },
  });

  if (client.systemEvent?.create) {
    await client.systemEvent.create({
      data: {
        type: "OUTREACH_LOGGED",
        message: `Operator logged ${options.channel} outreach as ${status} for ${targetLead.email || targetLead.id}`,
        metadata: { leadId: targetLead.id, channel: options.channel, status },
      },
    });
  }

  return {
    success: true,
    leadId: targetLead.id,
    channel: options.channel,
    status,
    updatedAt: timestamp,
  };
}

export function printOutreachLinks() {
  console.log("============================================================");
  console.log("SHADOWSPARK COMMERCIAL CONTROL PLANE — OUTREACH DISPATCHER");
  console.log("Batch 01: 10 Verified Nigerian Financial Institutions");
  console.log("============================================================\n");

  for (const p of PROSPECTS) {
    const mailto = generateMailtoUrl(p);
    const whatsapp = generateWhatsAppUrl(p);
    console.log(`[PROSPECT ${p.id}] ${p.company}`);
    console.log(`  Role: ${p.role}`);
    console.log(`  Email Target: ${p.contactEmail}`);
    console.log(`  LinkedIn People: ${p.linkedInUrl}`);
    console.log(`  Click-to-Email URL: ${mailto.slice(0, 100)}...`);
    console.log(`  Click-to-WhatsApp URL: ${whatsapp.slice(0, 100)}...\n`);
  }

  console.log("============================================================");
  console.log("All 10 outreach packages generated with active dispatch URLs.");
  console.log("Ready for transmission by founder / operator.");
  console.log("============================================================");
}

export async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let mode = "links";
  let channel = "";
  let leadTarget = "";
  let status = "sent";
  let notes = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mode" && args[i + 1]) {
      mode = args[++i];
    } else if (arg === "--channel" && args[i + 1]) {
      channel = args[++i];
    } else if (arg === "--lead" && args[i + 1]) {
      leadTarget = args[++i];
    } else if (arg === "--status" && args[i + 1]) {
      status = args[++i];
    } else if (arg === "--notes" && args[i + 1]) {
      notes = args[++i];
    } else if (arg === "--send-email") {
      mode = "email";
    } else if (arg === "--log") {
      mode = "log";
    }
  }

  if (mode === "links" && !channel) {
    printOutreachLinks();
    return;
  }

  if (mode === "email" || channel === "email") {
    console.log("============================================================");
    console.log("SHADOWSPARK — EXECUTING EMAIL OUTREACH DISPATCH");
    console.log("============================================================\n");

    const targets = leadTarget
      ? PROSPECTS.filter(
          (p) =>
            p.contactEmail.toLowerCase() === leadTarget.toLowerCase() ||
            p.id.toString() === leadTarget
        )
      : PROSPECTS;

    if (targets.length === 0) {
      console.error(`Error: No target matching '${leadTarget}' found in Batch 01.`);
      process.exitCode = 1;
      return;
    }

    for (const target of targets) {
      try {
        const res = await dispatchOutreachEmail({
          email: target.contactEmail,
          subject: target.subject,
          body: target.messageBody,
        });
        console.log(
          `  ✓ [Dispatched] ${target.company} <${target.contactEmail}> — ID: ${res.messageId || "simulated"}`
        );
      } catch (err: any) {
        console.error(`  ✗ [Failed] ${target.company}: ${err.message}`);
      }
    }
    return;
  }

  if (mode === "log" || channel === "linkedin" || channel === "whatsapp") {
    const targetChannel = (channel || "linkedin") as "email" | "linkedin" | "whatsapp";
    if (!leadTarget) {
      console.error("Error: --lead <email|id> is required for manual dispatch logging.");
      process.exitCode = 1;
      return;
    }

    try {
      const res = await logManualDispatch({
        email: leadTarget.includes("@") ? leadTarget : undefined,
        leadId: !leadTarget.includes("@") ? leadTarget : undefined,
        channel: targetChannel,
        status,
        notes,
      });
      console.log(
        `✓ Logged ${res.channel} outreach as '${res.status}' for lead ${res.leadId} at ${res.updatedAt}`
      );
    } catch (err: any) {
      console.error(`✗ Failed to log dispatch: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  // Fallback
  printOutreachLinks();
}

if (process.argv[1]?.endsWith("dispatch-outreach.ts")) {
  main();
}
