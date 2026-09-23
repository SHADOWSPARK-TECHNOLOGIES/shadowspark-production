/**
 * Batch 01 Prospect Seeding Script — ShadowSpark Commercial Control Plane
 * 
 * Idempotently upserts the 10 qualified Nigerian fintech target institutions
 * into PostgreSQL (Lead table) with structured multi-channel metadata.
 * 
 * Target definitions source: docs/OUTREACH_CAMPAIGN_BATCH_01.md
 * Regulatory anchor: SEC Circular 26-1 & CBN AML Directives
 */

import { prisma as defaultPrisma } from "@/lib/prisma";

export interface TargetProspect {
  id: number;
  company: string;
  category: string;
  role: string;
  email: string;
  linkedInUrl: string;
  phoneNumber?: string | null;
  regulatoryAnchor: string;
  painPoint: string;
}

export const BATCH_01_PROSPECTS: TargetProspect[] = [
  {
    id: 1,
    company: "FairMoney Microfinance Bank",
    category: "Primary ICP — Digital Lending / Neobank",
    role: "Head of Compliance / CRO",
    email: "compliance@fairmoney.io",
    linkedInUrl: "https://www.linkedin.com/company/fairmoney/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & CBN Directives",
    painPoint: "High-velocity loan application anomalies, BVN-phone mismatches, and income narrative review.",
  },
  {
    id: 2,
    company: "Carbon (OneFi MFB)",
    category: "Primary ICP — Digital Lending / Neobank",
    role: "Head of Risk & Compliance",
    email: "compliance@getcarbon.co",
    linkedInUrl: "https://www.linkedin.com/company/getcarbon/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & CBN Directives",
    painPoint: "Instant loan exception triaging, multi-account identity velocity flags, and informal notes review.",
  },
  {
    id: 3,
    company: "Renmoney Microfinance Bank",
    category: "Primary ICP — Consumer Credit & MSME Lending",
    role: "Chief Risk Officer / Compliance Lead",
    email: "compliance@renmoney.com",
    linkedInUrl: "https://www.linkedin.com/company/renmoney/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & CBN Directives",
    painPoint: "Salary loan verification exceptions, employer verification mismatch holds.",
  },
  {
    id: 4,
    company: "Branch International Nigeria",
    category: "Primary ICP — Digital Micro-Lending",
    role: "Head of Compliance & Operations",
    email: "nigeria-compliance@branch.co",
    linkedInUrl: "https://www.linkedin.com/company/branch-international/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & CBN Directives",
    painPoint: "Device integrity flags, machine learning underwriting edge cases, regulatory identity holds.",
  },
  {
    id: 5,
    company: "Kuda Microfinance Bank",
    category: "Primary ICP — Neobank & Consumer Credit",
    role: "Chief Compliance Officer / Head of AML",
    email: "compliance@kuda.com",
    linkedInUrl: "https://www.linkedin.com/company/kudabank/people/?keywords=compliance",
    regulatoryAnchor: "CBN AML/CFT Directives & Circular 26-1",
    painPoint: "Tier-upgrade verification anomalies, high-frequency P2P narrative holds, rapid customer expansion.",
  },
  {
    id: 6,
    company: "PalmPay Nigeria",
    category: "Primary ICP — Payments & Agency Banking",
    role: "Head of Regulatory Compliance",
    email: "compliance@palmpay-inc.com",
    linkedInUrl: "https://www.linkedin.com/company/palmpay/people/?keywords=compliance",
    regulatoryAnchor: "CBN AML/CFT Directives & Transaction Velocity Controls",
    painPoint: "High-throughput agent/merchant KYC verification anomalies, transaction velocity alerts.",
  },
  {
    id: 7,
    company: "Quidax",
    category: "Secondary ICP — SEC Licensed Digital Assets Exchange (DAX)",
    role: "Chief Compliance Officer / MLRO",
    email: "compliance@quidax.com",
    linkedInUrl: "https://www.linkedin.com/company/quidax/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 Provisional DAX Framework",
    painPoint: "Fiat-crypto deposit narrative exceptions, travel rule counterparty documentation, SEC audit readiness.",
  },
  {
    id: 8,
    company: "Busha",
    category: "Secondary ICP — SEC Licensed VASP / Exchange",
    role: "Head of Compliance & Legal",
    email: "compliance@busha.co",
    linkedInUrl: "https://www.linkedin.com/company/busha/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & Mastercard Crypto Credential",
    painPoint: "Circular 26-1 compliance audit documentation, counterparty identity exceptions, cryptographic audit trails.",
  },
  {
    id: 9,
    company: "Yellow Card Nigeria",
    category: "Secondary ICP — VASP / Liquidity Provider",
    role: "Regional Compliance Director / MLRO",
    email: "compliance@yellowcard.io",
    linkedInUrl: "https://www.linkedin.com/company/yellow-card-app/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 & Cross-Border Stablecoin Reporting",
    painPoint: "Institutional cross-border stablecoin & liquidity flows, PEP/sanction hold reviews, multi-jurisdiction reporting.",
  },
  {
    id: 10,
    company: "Flitaa",
    category: "Secondary ICP — Digital Asset Provider / OTC Desk",
    role: "Head of Operations & Compliance",
    email: "compliance@flitaa.com",
    linkedInUrl: "https://www.linkedin.com/company/flitaa/people/?keywords=compliance",
    regulatoryAnchor: "SEC Circular 26-1 OTC Asset Framework",
    painPoint: "OTC digital asset transaction exception reviews, high-value transfer documentation under Circular 26-1.",
  },
];

export interface SeedResult {
  total: number;
  upserted: number;
  prospects: Array<{
    id: string;
    email: string;
    company: string;
    status: string;
  }>;
}

/**
 * Idempotently seeds or updates the 10 Batch 01 prospects in PostgreSQL.
 */
export async function seedBatch01Prospects(client: any = defaultPrisma): Promise<SeedResult> {
  const seededProspects: Array<{ id: string; email: string; company: string; status: string }> = [];

  for (const prospect of BATCH_01_PROSPECTS) {
    const existingLead = await client.lead.findUnique({
      where: { email: prospect.email },
    });

    const existingMetadata =
      existingLead?.metadata && typeof existingLead.metadata === "object"
        ? (existingLead.metadata as Record<string, any>)
        : {};

    const existingChannels = existingMetadata.channels || {};

    const channels = {
      email: {
        address: prospect.email,
        status: existingChannels.email?.status || "pending",
        lastDispatchedAt: existingChannels.email?.lastDispatchedAt || null,
        messageId: existingChannels.email?.messageId || null,
      },
      linkedin: {
        profileUrl: prospect.linkedInUrl,
        status: existingChannels.linkedin?.status || "pending",
        lastDispatchedAt: existingChannels.linkedin?.lastDispatchedAt || null,
      },
      whatsapp: {
        status: existingChannels.whatsapp?.status || "pending",
        lastDispatchedAt: existingChannels.whatsapp?.lastDispatchedAt || null,
        deliveryStatus: existingChannels.whatsapp?.deliveryStatus || null,
      },
    };

    const metadata = {
      ...existingMetadata,
      batch: "BATCH_01",
      institution: prospect.company,
      category: prospect.category,
      targetRole: prospect.role,
      regulatoryAnchor: prospect.regulatoryAnchor,
      painPoint: prospect.painPoint,
      channels,
      pilotTerms: existingMetadata.pilotTerms || {
        durationDays: 14,
        tier: "enterprise",
        status: "offered",
      },
    };

    const lead = await client.lead.upsert({
      where: { email: prospect.email },
      update: {
        intent: `SEC Circular 26-1 exception review and pilot onboarding for ${prospect.company}`,
        tier: "enterprise",
        leadScore: existingLead?.leadScore ?? 85,
        metadata,
        updatedAt: new Date(),
      },
      create: {
        email: prospect.email,
        phoneNumber: prospect.phoneNumber ?? null,
        intent: `SEC Circular 26-1 exception review and pilot onboarding for ${prospect.company}`,
        status: "QUALIFIED",
        tier: "enterprise",
        leadScore: 85,
        metadata,
      },
    });

    seededProspects.push({
      id: lead.id,
      email: lead.email || prospect.email,
      company: prospect.company,
      status: lead.status,
    });
  }

  return {
    total: BATCH_01_PROSPECTS.length,
    upserted: seededProspects.length,
    prospects: seededProspects,
  };
}

export async function main() {
  console.log("============================================================");
  console.log("SHADOWSPARK — SEEDING BATCH 01 TARGET NIGERIAN FINTECHS");
  console.log("============================================================\n");

  if (!process.env.DATABASE_URL) {
    console.warn("Notice: DATABASE_URL is not configured in this environment.");
    console.warn("Seeding requires an active PostgreSQL connection string.");
    console.log(`Defined ${BATCH_01_PROSPECTS.length} target institutions ready for seeding:`);
    for (const p of BATCH_01_PROSPECTS) {
      console.log(`- [${p.id}] ${p.company} (${p.email})`);
    }
    return;
  }

  try {
    const result = await seedBatch01Prospects();
    console.log(`Successfully upserted ${result.upserted}/${result.total} prospects:\n`);
    for (const p of result.prospects) {
      console.log(`  ✓ [${p.id}] ${p.company} <${p.email}> — Status: ${p.status}`);
    }
    console.log("\nBatch 01 prospects initialized with structured channel states.");
  } catch (error) {
    console.error("Failed to seed prospects:", error);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("seed-batch01-prospects.ts")) {
  main();
}
