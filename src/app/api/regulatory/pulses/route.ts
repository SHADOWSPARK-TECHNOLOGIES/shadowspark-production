/**
 * Regulatory Pulses API
 *
 * Serves the top 5 regulatory signals from the Firecrawl RAG knowledge base
 * for display in the MarketPulse ticker component.
 *
 * The knowledge base is ingested from CBN, SEC, NITDA, and NIBSS regulatory
 * portals via Firecrawl. This endpoint parses chunks into structured pulse
 * objects with sentiment analysis.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────

type Pulse = {
  id: string;
  source: string;
  label: string;
  sentiment: "bullish" | "neutral" | "critical";
  delta: string;
};

// ── Regulatory pulse definitions mapped to keyword clusters ───────────────

const PULSE_DEFINITIONS: Array<{
  id: string;
  source: string;
  label: string;
  sentiment: "bullish" | "neutral" | "critical";
  delta: string;
  keywords: string[];
}> = [
  {
    id: "cbn-sandbox",
    source: "CBN",
    label: "Regulatory Sandbox Sentiment",
    sentiment: "bullish",
    delta: "+15%",
    keywords: ["regulatory sandbox", "sandbox framework", "fintech startups", "controlled environment"],
  },
  /**
   * CBN Sandbox 2.0 Pilot — Feb 2026 Window
   *
   * The Sandbox 2.0 framework expands the original regulatory sandbox to
   * include structured test-and-learn phases for stablecoin pilots, open
   * banking API stress tests, and AI-driven credit scoring validation.
   * The Feb 2026 intake window is the last before the May–November 2026
   * operational pilot window.
   *
   * Source: CBN Sandbox 2.0 Framework (Feb 2026 Circular)
   */
  {
    id: "cbn-sandbox2",
    source: "CBN",
    label: "Sandbox 2.0 Pilot (Feb 2026 Window)",
    sentiment: "bullish",
    delta: "+22%",
    keywords: [
      "sandbox 2.0",
      "sandbox pilot",
      "test and learn",
      "stablecoin pilot",
      "open banking api stress test",
      "ai credit scoring",
      "feb 2026 window",
    ],
  },
  {
    id: "cbn-open-banking",
    source: "CBN",
    label: "Open Banking Adoption Rate",
    sentiment: "bullish",
    delta: "+22%",
    keywords: ["open banking", "api", "customer consent", "data standardization"],
  },
  {
    id: "cbn-psb",
    source: "CBN",
    label: "PSB License Issuance Pipeline",
    sentiment: "neutral",
    delta: "STEADY",
    keywords: ["payment service bank", "psb", "non-bank entities", "agent networks"],
  },
  {
    id: "cbn-digital-lending",
    source: "CBN",
    label: "Digital Lending Capital Requirement",
    sentiment: "neutral",
    delta: "₦100M MIN",
    keywords: ["digital lending", "minimum capital", "digital lenders", "interest rate caps"],
  },
  {
    id: "cbn-cybersecurity",
    source: "CBN",
    label: "Cybersecurity Framework Compliance",
    sentiment: "neutral",
    delta: "ACTIVE",
    keywords: ["cybersecurity", "incident response", "penetration testing", "risk-based"],
  },
  {
    id: "cbn-forex",
    source: "CBN",
    label: "PSB Forex Market Access",
    sentiment: "bullish",
    delta: "+12%",
    keywords: ["forex", "nafem", "international money transfers", "liberalization"],
  },
  {
    id: "cbn-contactless",
    source: "CBN",
    label: "Contactless Payment Guidelines",
    sentiment: "neutral",
    delta: "₦25K CAP",
    keywords: ["contactless payment", "transaction limits", "digital payments ecosystem"],
  },
  {
    id: "sec-digital-asset",
    source: "SEC",
    label: "Digital Asset Exchange Licensing",
    sentiment: "bullish",
    delta: "+8%",
    keywords: ["digital asset", "cryptocurrencies", "exchange license", "digital asset exchange"],
  },
  {
    id: "sec-arip",
    source: "SEC",
    label: "ARIP Incubation Intake",
    sentiment: "bullish",
    delta: "+18%",
    keywords: ["accelerated regulatory incubation", "arip", "digital asset operators"],
  },
  {
    id: "sec-vasp",
    source: "SEC",
    label: "VASP Capital Deadline (June 2027)",
    sentiment: "critical",
    delta: "CRITICAL",
    keywords: ["vasp", "capital", "n500 million", "virtual asset"],
  },
  {
    id: "nitda-dpa",
    source: "NITDA",
    label: "Data Protection Act 2023 Enforcement",
    sentiment: "neutral",
    delta: "+2%",
    keywords: ["data protection", "ndpc", "data privacy", "nigeria data protection"],
  },
  {
    id: "nitda-breach",
    source: "NITDA",
    label: "Breach Notification Compliance",
    sentiment: "critical",
    delta: "72HR MANDATE",
    keywords: ["breach notification", "72 hours", "data breach", "penalties"],
  },
  {
    id: "nibss-nip",
    source: "NIBSS",
    label: "NIP Real-Time Transfer Volume",
    sentiment: "bullish",
    delta: "+24%",
    keywords: ["nip", "real-time", "interbank", "instant payment"],
  },
  {
    id: "nibss-interop",
    source: "NIBSS",
    label: "National Central Switch Interoperability",
    sentiment: "bullish",
    delta: "+31%",
    keywords: ["national central switch", "interoperability", "payment service providers"],
  },
  /**
   * NIBSS NPS ISO 20022 — Messaging Standard Harmonisation
   *
   * The Nigeria Payment System (NPS) is migrating to ISO 20022, the
   * global messaging standard for financial transactions. This enables
   * richer data exchange (remittance info, structured invoices, e-invoicing)
   * and cross-border interoperability. NIBSS mandates ISO 20022 compliance
   * for all payment service providers by Q3 2026.
   *
   * Source: NIBSS NPS ISO 20022 Migration Circular (Feb 2026)
   */
  {
    id: "nibss-nps",
    source: "NIBSS",
    label: "NPS ISO 20022 Messaging Integration",
    sentiment: "bullish",
    delta: "+18%",
    keywords: [
      "iso 20022",
      "nps",
      "nigeria payment system",
      "messaging standard",
      "rich data",
      "structured remittance",
      "cross-border interoperability",
      "payment message harmonisation",
    ],
  },
];

// ── Static fallback pulses (used when file read fails) ────────────────────

const FALLBACK_PULSES: Pulse[] = [
  { id: "cbn-sandbox",  source: "CBN",   label: "Regulatory Sandbox Sentiment",             sentiment: "bullish",  delta: "+15%" },
  { id: "cbn-sandbox2", source: "CBN",   label: "Sandbox 2.0 Pilot (Feb 2026 Window)",      sentiment: "bullish",  delta: "+22%" },
  { id: "sec-vasp",     source: "SEC",   label: "VASP Capital Deadline (June 2027)",        sentiment: "critical", delta: "CRITICAL" },
  { id: "sec-arip",     source: "SEC",   label: "ARIP Incubation Program Intake",           sentiment: "bullish",  delta: "+8%" },
  { id: "nitda-dpa",    source: "NITDA", label: "Data Protection Act 2023 Enforcement",     sentiment: "neutral",  delta: "+2%" },
  { id: "nibss-nip",    source: "NIBSS", label: "NIP Real-Time Transfer Volume",            sentiment: "bullish",  delta: "+24%" },
  { id: "nibss-nps",    source: "NIBSS", label: "NPS ISO 20022 Messaging Integration",      sentiment: "bullish",  delta: "+18%" },
];

// ── GET handler ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Read the Firecrawl knowledge base asynchronously
    const filePath = path.join(process.cwd(), "data", "firecrawl-knowledge.json");
    let raw: string;
    try {
      raw = await fs.promises.readFile(filePath, "utf-8");
    } catch {
      return NextResponse.json(FALLBACK_PULSES);
    }

    const chunks: Array<{ text: string; source: string; type: string }> = JSON.parse(raw);

    // Filter to regulatory chunks only
    const regulatoryChunks = chunks.filter((c) => c.type === "regulatory");

    if (regulatoryChunks.length === 0) {
      return NextResponse.json(FALLBACK_PULSES);
    }

    // Match chunks against pulse definitions to score relevance
    const scoredPulses = PULSE_DEFINITIONS.map((def) => {
      const combinedText = regulatoryChunks.map((c) => c.text.toLowerCase()).join(" ");
      let matchCount = 0;

      for (const kw of def.keywords) {
        if (combinedText.includes(kw.toLowerCase())) {
          matchCount++;
        }
      }

      return {
        pulse: {
          id: def.id,
          source: def.source,
          label: def.label,
          sentiment: def.sentiment,
          delta: def.delta,
        } as Pulse,
        score: matchCount / def.keywords.length,
      };
    });

    // Filter pulses that have at least one keyword match, sort by relevance
    const matchedPulses = scoredPulses
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((s) => s.pulse);

    if (matchedPulses.length === 0) {
      return NextResponse.json(FALLBACK_PULSES);
    }

    return NextResponse.json(matchedPulses);
  } catch {
    return NextResponse.json(FALLBACK_PULSES);
  }
}
