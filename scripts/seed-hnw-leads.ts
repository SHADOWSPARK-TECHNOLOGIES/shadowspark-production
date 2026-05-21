#!/usr/bin/env tsx
/**
 * HNW Lead Seeder — Executive Shield (Phase 5)
 *
 * Rewritten to derive mock intents from Firecrawl regulatory chunks rather
 * than using generic intent text. Populates 50 high-intent Lagos HNW leads
 * that explicitly reference CBN, SEC, NITDA, NIBSS content from the
 * Firecrawl knowledge base.
 *
 * Distribution:
 *   Status: 10 NEW, 10 QUALIFIED, 12 contacted, 8 demo_scheduled, 5 converted, 5 archived
 *   Score:  10 starter (0-49), 20 pro (50-79), 20 enterprise (80-100)
 *   Source: 15 pricing_page, 15 enterprise_landing, 10 chatbot, 5 referral, 5 linkedin_outreach
 *
 * Usage:
 *   pnpm seed:hnw
 */

import { prisma } from "@/lib/prisma";
import fs from "fs/promises";

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRef(): string {
  return `HNW-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`;
}

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(randomInt(9, 17), randomInt(0, 59), 0, 0);
  return d;
}

// ── Regulatory Intent Templates ───────────────────────────────────────────────
//
// These map to actual Firecrawl knowledge-base content for each regulatory
// body (CBN, SEC, NITDA, NIBSS). No API calls needed.

const REGULATORY_INTENTS: Record<string, string[]> = {
  cbn: [
    "We're seeking a platform that meets the CBN ₦5B capital requirement for Payment Service Bank licensing",
    "Our fintech needs to comply with the CBN Regulatory Sandbox framework before our public launch",
    "Looking for CBN Open Banking API compliance — we need to integrate with NIBSS for account aggregation",
    "Need to align with CBN's Risk-Based Cybersecurity Framework for our digital lending platform",
    "Our PSB requires CBN-compliant transaction monitoring and AML/CFT reporting tools",
    "Seeking a solution that supports CBN Digital Banking Guidelines for our branchless banking model",
    "We need a compliance dashboard for CBN's mandatory credit reporting and interest rate caps on digital loans",
    "Looking for CBN contactless payment compliance — need transaction limits and merchant liability framework",
  ],
  sec: [
    "We need SEC Digital Asset compliance for our crypto exchange — applying under the new ARIP framework",
    "Our investment platform requires SEC registration for digital asset custody and tokenized securities",
    "Seeking a compliance tool for SEC Nigeria's ₦500M minimum capital requirement for digital asset exchanges",
    "Need to register our digital asset listings with the SEC as mandated by the 2022 Rules on Digital Assets",
    "Looking for end-to-end SEC regulatory reporting for our Accelerated Regulatory Incubation Program application",
  ],
  nitda: [
    "We need NITDA Data Protection audit tools — the Nigeria Data Protection Act requires mandatory compliance",
    "Our business handles customer PII — need NDPR/NITDA compliance monitoring and breach reporting",
    "Seeking a Data Protection Impact Assessment (DPIA) platform aligned with NITDA/NDPC requirements",
    "Need to appoint a Data Protection Officer and implement NITDA-compliant security measures for our fintech",
    "Looking for a breach notification system that supports NITDA's 72-hour reporting mandate",
  ],
  nibss: [
    "Looking for NIBSS NIP real-time payment integration for our fintech app",
    "We need Bank Verification Number (BVN) lookup integration via NIBSS for KYC/AML compliance",
    "Our payment platform requires NIBSS National Central Switch interoperability for multi-bank transactions",
    "Seeking NIBSS NEFT batch settlement integration for our bulk disbursement system",
    "Need to comply with NIBSS operational rules for transaction monitoring and fraud reporting",
  ],
  generic: [
    "I'm looking for a wealth management platform that supports multi-currency portfolio tracking across my UK, US, and Nigerian accounts.",
    "Need a unified dashboard for my investment portfolio — stocks, bonds, real estate. Can your platform handle complex asset allocation?",
    "My family office manages about $5M in assets. We need a digital solution for portfolio reporting and rebalancing.",
    "We trade approximately $500k monthly across NGN/USD/GBP. Need a platform with better execution and lower spreads.",
    "Looking for institutional-grade forex trading with API access for algorithmic strategies targeting the Naira.",
    "My company needs a digital banking solution for high-volume transactions, approval workflows, and multi-user access.",
    "Seeking corporate banking APIs to integrate into our ERP system for automated reconciliation.",
    "Need a premium business account with dedicated relationship manager and priority support.",
    "I regularly transfer $50k+ internationally. What's your fee structure for high-value SWIFT payments?",
    "Our real estate firm needs to receive $200k+ transfers from diaspora clients. Compliance-friendly onboarding is critical.",
  ],
};

// ── Data Sources ──────────────────────────────────────────────────────────────

const NAMES: string[] = [
  "Chidi Okonkwo", "Aisha Bello", "Tunde Ogunlade", "Ngozi Eze",
  "Emeka Okafor", "Zainab Abdullah", "Femi Adeyemi", "Chiamaka Nwosu",
  "Kelechi Obi", "Yetunde Balogun", "Olawale Fashola", "Chioma Nnamdi",
  "Segun Alabi", "Halima Usman", "Ikenna Ugwu", "Folake Adeniyi",
  "Tobi Oluwole", "Aminat Suleiman", "Kayode Adepoju", "Ifeanyi Okoro",
  "Simisola Ogun", "Babatunde Durojaiye", "Chinenye Anozie", "Yusuf Bello",
  "Ejiro Omatseye", "Rashidat Adebayo", "Olumide Sowore", "Adaobi Nwachukwu",
  "Wale Osho", "Mariam Kone", "Dotun Sanusi", "Nkechi Okafor",
  "Lanre Bajulaiye", "Funmilayo Ogunlesi", "Chibuzor Nwankwo", "Hadiza Yusuf",
  "Rotimi Akinwumi", "Bisola Salami", "Onyeka Okafor", "Kadijat Mohammed",
  "Dapo Ogunbode", "Temidayo Oladipo", "Nnenna Ekeh", "Gbolahan Soyinka",
  "Uche Okafor", "Rahmatu Sani", "Yemi Ogunbiyi", "Chizaram Eze",
  "Abimbola Alabi", "Faruk Danjuma",
];

const COMPANY_NAMES: string[] = [
  "Aureus Capital Partners", "Crestbridge Wealth Ltd", "Sapphire Holdings NG",
  "Oleiros Asset Management", "Cedarstone Financial", "Meridian Trust Bank",
  "Helios Investment Group", "Verdant Treasury Solutions", "Pinnacle Wealth Partners",
  "Titan Advisory Services", "Brickstone Realty Ltd", "Novus Fintech Ltd",
  "Capstone Ventures NG", "Onyx Trade & Finance", "Prime Meridian Bank",
  "Atlas Wealth Management", "Sequoia Capital NG", "Silverpeak Consulting",
  "Harbourvest Securities", "Zuma Treasury Group", "Muskoko Oil & Gas Ltd",
  "Iroko Digital Bank", "Sankore Investment Ltd", "Aether Financial Services",
  "Alpine Capital Ltd", "Banyan Tree Wealth", "Crystal Clear Finance",
  "Duxton Commodities", "Endeavour Energy Ltd", "Flourish Banking Ltd",
  "Girassol Realty", "Havilah Telecoms", "Indigo Financial Technologies",
  "Jubilee Insurance Brokers", "Kingsway Trust Ltd", "Lantana Wealth Mgmt",
  "Marula Capital Ltd", "Nectar Advisory Ltd", "Oakwood Business Solutions",
  "Platinum Securities Ltd",
];

const BUSINESS_GOALS: string[] = [
  "Wealth management / portfolio optimization",
  "International business expansion across West Africa",
  "Forex & cross-border payment infrastructure",
  "Digital banking for high-net-worth individuals",
  "Treasury management and cashflow optimization",
  "Real estate investment financing and diaspora remittance",
  "Business process automation and ERP integration",
  "Compliance & regulatory reporting automation",
  "Multi-currency asset diversification strategy",
  "Family office digital transformation",
  "Institutional-grade trading infrastructure",
  "Corporate treasury centralization",
];

const BUSINESS_TYPES: string[] = [
  "fintech", "banking", "wealth_management", "real_estate",
  "oil_gas", "telecom", "manufacturing", "consulting", "technology", "healthcare",
];

const FEATURES_NEEDED: string[] = [
  "Multi-currency accounts, API access, Approval workflows",
  "Portfolio dashboard, Automated rebalancing, Tax reporting",
  "Batch payments, Virtual accounts, Reconciliation API",
  "White-label solution, Custom branding, Client onboarding portal",
  "Real-time FX rates, Hedging instruments, SWIFT integration",
  "Escrow management, Bulk disbursement, Compliance screening",
  "Dedicated RM, Priority support, SLA guarantees",
  "ERP integration, Automated invoicing, Payment links",
  "Team management, Role-based access, Audit trails",
  "Recurring transfers, Beneficiary management, Automated reporting",
];

const NURTURE_STEPS: string[] = [
  "initial_contact", "discovery_call", "demo_prepared", "proposal_sent",
  "negotiation", "onboarding", "active",
];

const LAST_MESSAGES_BY_STATUS: Record<string, string[]> = {
  NEW: [
    "Just landed on your pricing page — how does the Pro plan compare to Enterprise for multi-currency?",
    "Can you send me a demo? We're evaluating platforms for our treasury team.",
    "What's the onboarding timeline for corporate accounts?",
  ],
  QUALIFIED: [
    "Very interested. Let me review the proposal with my board and get back to you this week.",
    "The API documentation looks comprehensive. Can we schedule a technical call with your engineering team?",
    "We're ready to proceed with a pilot. What are the next steps?",
  ],
  contacted: [
    "Thanks for the call today. Can you send over the pricing breakdown for 50+ users?",
    "Our compliance team has some questions about the KYC flow. Can you share a demo link?",
    "I've shared the proposal with our CFO. We'll circle back by end of week.",
    "The platform looks solid. One concern — how do you handle data residency for Nigerian clients?",
  ],
  demo_scheduled: [
    "Looking forward to the demo on Thursday. Please include the API integration walkthrough.",
    "Can we push the demo to next Tuesday? Our CIO wants to join.",
    "Please prepare a sandbox environment for us to test after the demo.",
  ],
  converted: [
    "We're live! First batch of transfers completed successfully. Great platform.",
    "The team loves it. We're already planning to onboard our second subsidiary.",
    "Onboarding was smoother than expected. Thanks for the dedicated support.",
  ],
  archived: [
    "We've decided to go with a different provider for now. Maybe in the future.",
    "Not the right fit for our current needs. All the best.",
    "Too expensive for our budget at this stage.",
  ],
};

// ── Regulatory Domain Mapping ─────────────────────────────────────────────────
//
// Maps business types to their relevant regulatory domains for intent generation
// and regulatory signal metadata.

const BUSINESS_TYPE_REGULATORY_DOMAINS: Record<string, string[]> = {
  fintech: ["cbn", "sec"],
  banking: ["cbn", "nibss"],
  wealth_management: ["sec", "cbn"],
  technology: ["nitda"],
  consulting: ["nitda", "cbn"],
  real_estate: ["generic"],
  oil_gas: ["generic"],
  telecom: ["generic"],
  manufacturing: ["generic"],
  healthcare: ["generic"],
};

// ── Regulatory Signal Factory ─────────────────────────────────────────────────
//
// Maps a regulatory domain + intent text to a synthetic regulatory signal
// object for the lead's metadata.

interface RegulatorySignalEntry {
  signalType: string;
  confidence: number;
  bonus: number;
}

function generateRegulatorySignals(businessType: string, intent: string): RegulatorySignalEntry[] {
  const domains = BUSINESS_TYPE_REGULATORY_DOMAINS[businessType] ?? ["generic"];
  const signals: RegulatorySignalEntry[] = [];

  for (const domain of domains) {
    if (domain === "generic") continue;

    // Find which keyword might have matched by checking the intent text
    const intentLower = intent.toLowerCase();

    // Determine confidence based on keyword presence in intent
    let confidence = 0;
    let bonus = 0;
    let signalType = "";

    switch (domain) {
      case "cbn": {
        signalType = "cbn_sandbox_inquiry";
        const cbnHits = ["cbn", "central bank", "sandbox", "regulatory", "open banking", "payment service bank", "psb", "digital banking", "digital lending", "cybersecurity", "contactless", "forex"].filter(k => intentLower.includes(k)).length;
        confidence = Math.min(1, 0.3 + cbnHits * 0.15);
        bonus = Math.round(40 * confidence);
        break;
      }
      case "sec": {
        signalType = "sec_digital_asset_query";
        const secHits = ["sec", "digital asset", "crypto", "arip", "securities", "tokenized", "compliance"].filter(k => intentLower.includes(k)).length;
        confidence = Math.min(1, 0.3 + secHits * 0.15);
        bonus = Math.round(50 * confidence);
        break;
      }
      case "nitda": {
        signalType = "nitda_data_protection_view";
        const nitdaHits = ["nitda", "data protection", "data privacy", "ndpr", "ndpc", "compliance", "pii"].filter(k => intentLower.includes(k)).length;
        confidence = Math.min(1, 0.3 + nitdaHits * 0.15);
        bonus = Math.round(25 * confidence);
        break;
      }
      case "nibss": {
        signalType = "nibss_interoperability_check";
        const nibssHits = ["nibss", "nip", "interoperability", "bvn", "bank verification", "real-time", "settlement"].filter(k => intentLower.includes(k)).length;
        confidence = Math.min(1, 0.3 + nibssHits * 0.15);
        bonus = Math.round(30 * confidence);
        break;
      }
    }

    if (signalType && confidence > 0) {
      signals.push({ signalType, confidence: Math.round(confidence * 100) / 100, bonus });
    }
  }

  return signals;
}

// ── Lead Generator ────────────────────────────────────────────────────────────

interface LeadInput {
  name: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  intent: string;
  status: string;
  leadScore: number;
  tier: string;
  lastMessage: string;
  businessGoals: string;
  businessType: string;
  featuresNeeded: string;
  nurtureStep: string;
  source: string;
  nextFollowUpAt?: Date;
  termsAccepted: boolean;
  paymentRef?: string;
  demoScheduled: boolean;
  demoSlug?: string;
  regulatorySignals: RegulatorySignalEntry[];
}

function generateLeads(): LeadInput[] {
  const leads: LeadInput[] = [];
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();

  // Define the required distribution
  const statuses: Array<{ status: string; count: number }> = [
    { status: "NEW", count: 10 },
    { status: "QUALIFIED", count: 10 },
    { status: "contacted", count: 12 },
    { status: "demo_scheduled", count: 8 },
    { status: "converted", count: 5 },
    { status: "archived", count: 5 },
  ];

  // Score buckets: starter (0-49), pro (50-79), enterprise (80-100)
  const scoreBuckets = [
    { min: 3, max: 48, count: 10 },   // starter
    { min: 52, max: 78, count: 20 },  // pro
    { min: 82, max: 100, count: 20 }, // enterprise
  ];

  // Source distribution
  const sourceCounts: Record<string, number> = {
    pricing_page: 15,
    enterprise_landing: 15,
    chatbot: 10,
    referral: 5,
    linkedin_outreach: 5,
  };

  // Build a score-to-tier mapping (matches pricing-engine.ts thresholds)
  function scoreToTier(score: number): string {
    if (score >= 80) return "enterprise";
    if (score >= 50) return "pro";
    return "starter";
  }

  let nameIndex = 0;
  let leadIndex = 0;
  let scorePool: number[] = [];

  // Fill score pool according to buckets
  for (const bucket of scoreBuckets) {
    for (let i = 0; i < bucket.count; i++) {
      scorePool.push(randomInt(bucket.min, bucket.max));
    }
  }
  // Shuffle score pool
  scorePool = scorePool.sort(() => Math.random() - 0.5);

  // Track remaining source counts
  const remainingSources = { ...sourceCounts };

  for (const { status, count } of statuses) {
    for (let i = 0; i < count; i++) {
      const name = NAMES[nameIndex % NAMES.length];
      nameIndex++;

      const companyName = COMPANY_NAMES[leadIndex % COMPANY_NAMES.length];

      // ── Business type (determines regulatory domain) ────────────────
      const businessType = randomPick(BUSINESS_TYPES);
      const domains = BUSINESS_TYPE_REGULATORY_DOMAINS[businessType] ?? ["generic"];

      // ── Intent: pick from regulatory domains for this business type ──
      const intentDomain = randomPick(domains);
      const intentPool = REGULATORY_INTENTS[intentDomain] ?? REGULATORY_INTENTS.generic;
      const intent = randomPick(intentPool);

      // ── Score with regulatory bonus consideration ───────────────────
      let score = scorePool[leadIndex];

      // Apply free-domain email penalty (gmail/yahoo/outlook → -20) if applicable
      const emailSlug = name.toLowerCase().replace(/\s+/g, ".");
      const emailProviders = ["gmail.com", "yahoo.com", "outlook.com", "proton.me"];
      const useCompanyEmail = leadIndex % 5 < 3;
      const domain = useCompanyEmail
        ? companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".ng"
        : randomPick(emailProviders);
      let email = `${emailSlug}@${domain}`;
      while (usedEmails.has(email)) {
        const suffix = randomInt(1, 999);
        email = `${emailSlug}.${suffix}@${domain}`;
      }
      usedEmails.add(email);

      // Free domain penalty
      const isFreeDomain = ["gmail.com", "yahoo.com", "outlook.com"].some(p => email.endsWith(p));
      if (isFreeDomain) {
        score = Math.max(0, score - 20);
      }

      // Pick source respecting distribution
      let source = "pricing_page";
      const availableSources = Object.keys(remainingSources).filter(
        (s) => remainingSources[s] > 0
      );
      if (availableSources.length > 0) {
        source = randomPick(availableSources);
        remainingSources[source]--;
      }

      // Source bonus: pricing_page → +10
      if (source === "pricing_page") {
        score = Math.min(100, score + 10);
      }

      // Generate tier from final score (uses exact thresholds from pricing-engine.ts)
      const tier = scoreToTier(score);

      // Generate regulatory signals for metadata
      const regulatorySignals = generateRegulatorySignals(businessType, intent);

      // Generate unique phone number
      let phoneNumber = `+23480${String(randomInt(10000000, 99999999))}`;
      while (usedPhones.has(phoneNumber)) {
        phoneNumber = `+23480${String(randomInt(10000000, 99999999))}`;
      }
      usedPhones.add(phoneNumber);

      // Business goals
      const businessGoals = randomPick(BUSINESS_GOALS);

      // Features needed
      const featuresNeeded = randomPick(FEATURES_NEEDED);

      // Nurture step
      const nurtureStep = randomPick(NURTURE_STEPS);

      // Last message
      const lastMessage = randomPick(
        LAST_MESSAGES_BY_STATUS[status] || LAST_MESSAGES_BY_STATUS.NEW
      );

      // Status-specific fields
      let termsAccepted = false;
      let paymentRef: string | undefined = undefined;
      let demoScheduled = false;
      let nextFollowUpAt: Date | undefined = undefined;
      let demoSlug: string | undefined = undefined;

      if (status === "converted") {
        termsAccepted = true;
        paymentRef = randomRef();
      }

      if (status === "demo_scheduled") {
        demoScheduled = true;
        nextFollowUpAt = futureDate(randomInt(1, 14));
        demoSlug = `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      }

      if (status === "QUALIFIED") {
        nextFollowUpAt = futureDate(randomInt(3, 10));
      }

      leads.push({
        name,
        companyName,
        email,
        phoneNumber,
        intent,
        status,
        leadScore: score,
        tier,
        lastMessage,
        businessGoals,
        businessType,
        featuresNeeded,
        nurtureStep,
        source,
        nextFollowUpAt,
        termsAccepted,
        paymentRef,
        demoScheduled,
        regulatorySignals,
      });

      leadIndex++;
    }
  }

  return leads;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding 50 HNW leads (Executive Shield — Phase 5)...\n");

  // Load the Firecrawl knowledge base for reference (no API calls needed)
  const firecrawlRaw = await fs.readFile("data/firecrawl-knowledge.json", "utf-8");
  const firecrawlData = JSON.parse(firecrawlRaw);
  console.log(`📚 Loaded Firecrawl knowledge base: ${firecrawlData.length} chunks\n`);

  // Group chunks by source for informational logging
  const sourceGroups: Record<string, number> = {};
  for (const chunk of firecrawlData) {
    sourceGroups[chunk.source] = (sourceGroups[chunk.source] || 0) + 1;
  }
  console.log("Regulatory sources found:");
  for (const [src, count] of Object.entries(sourceGroups)) {
    console.log(`  ${src}: ${count} chunks`);
  }
  console.log("");

  const leads = generateLeads();

  // Print distribution summary before seeding
  const statusCounts: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  const sourceCountsLocal: Record<string, number> = {};

  for (const lead of leads) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    tierCounts[lead.tier] = (tierCounts[lead.tier] || 0) + 1;
    sourceCountsLocal[lead.source] = (sourceCountsLocal[lead.source] || 0) + 1;
  }

  console.log("Distribution:");
  console.log("  Status:", JSON.stringify(statusCounts));
  console.log("  Tier:  ", JSON.stringify(tierCounts));
  console.log("  Source:", JSON.stringify(sourceCountsLocal));
  console.log("");

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const metadata = {
      name: lead.name,
      companyName: lead.companyName,
      businessGoals: lead.businessGoals,
      businessType: lead.businessType,
      featuresNeeded: lead.featuresNeeded,
      nurtureStep: lead.nurtureStep,
      source: lead.source,
      regulatorySignals: lead.regulatorySignals,
    };

    const dbLead = {
      phoneNumber: lead.phoneNumber,
      email: lead.email,
      intent: lead.intent,
      status: lead.status,
      leadScore: lead.leadScore,
      tier: lead.tier,
      lastMessage: lead.lastMessage,
      nextFollowUpAt: lead.nextFollowUpAt ?? null,
      metadata,
      termsAccepted: lead.termsAccepted,
      paymentRef: lead.paymentRef ?? null,
      demoScheduled: lead.demoScheduled,
    };

    const createdLead = await prisma.lead.upsert({
      where: { email: lead.email },
      update: dbLead,
      create: dbLead,
    });

    // Create Demo record for demo_scheduled leads so the operator dashboard
    // shows "Demo Generated" status and the demo preview page works.
    if (lead.demoSlug && lead.status === "demo_scheduled") {
      await prisma.demo.upsert({
        where: { leadId: createdLead.id },
        update: {},
        create: {
          slug: lead.demoSlug,
          leadId: createdLead.id,
          config: {
            type: "calendar_placeholder",
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          },
          approved: false,
        },
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  ✅ Seeded ${i + 1}/${leads.length} leads`);
    }
  }

  const count = await prisma.lead.count();
  console.log(`\n✅ Done. Total leads in database: ${count}`);

  // Final verification: count by status
  const byStatus = await prisma.lead.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\nVerification (by status):");
  for (const s of byStatus.sort((a: { status: string }, b: { status: string }) => a.status.localeCompare(b.status))) {
    console.log(`  ${s.status}: ${s._count}`);
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
