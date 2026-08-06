#!/usr/bin/env tsx
/**
 * HNW Market Relevance Analytics
 *
 * Analyzes the competitor knowledge base (firecrawl-knowledge.json) and scores
 * each data chunk for relevance to the High-Net-Worth (HNW) fintech market.
 *
 * Produces:
 *   1. Per-chunk HNW relevance scores with breakdown by thematic category
 *   2. Source-level aggregate rankings (which competitors are most HNW-relevant)
 *   3. Type-level insights (which content types matter most for HNW)
 *   4. Top-N most HNW-relevant chunks for actionable intelligence
 *
 * Usage:
 *   tsx scripts/hnw-market-analysis.ts
 *   tsx scripts/hnw-market-analysis.ts --top 15
 *   tsx scripts/hnw-market-analysis.ts --json
 */
import * as fs from "fs";
import * as path from "path";

// ── HNW Thematic Keyword Categories ──────────────────────────────────────────
// Each category represents a dimension of HNW fintech relevance.
// Weights: 0.0 – 1.0, higher = more indicative of HNW market focus.

const HNW_CATEGORIES = {
  wealth_management: {
    weight: 1.0,
    label: "Wealth & Asset Management",
    keywords: [
      "wealth", "asset management", "portfolio", "investment", "private banking",
      "family office", "estate", "trust", "fund management", "treasury",
      "capital preservation", "wealth advisory", "high net worth", "hnw",
      "uhnw", "ultra high net worth", "yield", "returns", "dividend",
    ],
  },
  premium_services: {
    weight: 0.9,
    label: "Premium / Concierge Services",
    keywords: [
      "premium", "concierge", "white-glove", "white glove", "bespoke",
      "exclusive", "vip", "priority", "dedicated", "personalized",
      "relationship manager", "private client", "premium tier",
    ],
  },
  capital_thresholds: {
    weight: 0.9,
    label: "Capital & Threshold Requirements",
    keywords: [
      "₦100 million", "₦500 million", "₦5 billion", "₦1 billion", "₦2 billion",
      "minimum capital", "capital requirement", "₦100", "₦500", "₦5",
      "capital base", "capital adequacy", "paid-up capital", "share capital",
      "₦200 million", "₦250 million", "₦300 million",
      "million", "billion",
    ],
  },
  forex_international: {
    weight: 0.8,
    label: "Forex & International Banking",
    keywords: [
      "forex", "foreign exchange", "nafem", "international transfer",
      "cross-border", "remittance", "global", "offshore", "foreign currency",
      "dollar", "usd", "euro", "gbp", "fx", "foreign investment",
      "international money transfer", "multi-currency", "multi currency",
    ],
  },
  digital_lending_credit: {
    weight: 0.7,
    label: "Lending & Credit for HNW",
    keywords: [
      "loan", "credit", "lending", "digital loan", "mortgage", "credit risk",
      "interest rate", "credit reporting", "borrower", "lender",
      "credit risk management", "loan recovery", "capital", "financing",
      "lines of credit",
    ],
  },
  enterprise_institutional: {
    weight: 0.8,
    label: "Enterprise / Institutional Banking",
    keywords: [
      "enterprise", "institutional", "corporate", "business banking",
      "payment service bank", "psb", "payment solution", "payment service",
      "pssp", "pss", "wholesale", "bulk payment", "mass payment",
      "b2b", "business account",
    ],
  },
  security_privacy: {
    weight: 0.85,
    label: "Security, Privacy & Compliance (HNW priority)",
    keywords: [
      "data protection", "privacy", "cybersecurity", "security", "encryption",
      "compliance", "kyc", "aml", "anti-money laundering", "cft",
      "data breach", "breach notification", "penetration testing",
      "risk-based", "incident response", "gdpr", "ndpr", "ndpc",
      "data protection impact assessment", "dpo", "data controller",
    ],
  },
  open_banking_api: {
    weight: 0.6,
    label: "Open Banking & API Infrastructure",
    keywords: [
      "open banking", "api", "third-party", "data sharing", "integration",
      "interoperability", "nibss", "national central switch", "nip",
      "neft", "real-time", "instant payment", "payment gateway",
      "financial data", "consent",
    ],
  },
  digital_assets_crypto: {
    weight: 0.7,
    label: "Digital Assets / Crypto (HNW investment class)",
    keywords: [
      "crypto", "cryptocurrency", "digital asset", "digital assets",
      "blockchain", "arip", "token", "exchange", "stablecoin",
      "defi", "custody", "digital asset exchange",
    ],
  },
  regulatory_sandbox: {
    weight: 0.5,
    label: "Regulatory Innovation (Sandbox)",
    keywords: [
      "regulatory sandbox", "sandbox", "innovation", "pilot",
      "controlled environment", "test", "experimentation",
      "regulatory approval", "license", "licensing",
    ],
  },
} as const;

type CategoryKey = keyof typeof HNW_CATEGORIES;

// ── Data Loading ─────────────────────────────────────────────────────────────

interface KnowledgeChunk {
  chunkId: number;
  source: string;
  url?: string;
  type: string;
  text: string;
  verified?: boolean;
}

function loadData(): KnowledgeChunk[] {
  const filePath = path.join(process.cwd(), "data", "firecrawl-knowledge.json");
  if (!fs.existsSync(filePath)) {
    console.error("❌ data/firecrawl-knowledge.json not found");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ── Scoring Engine ───────────────────────────────────────────────────────────

interface CategoryScore {
  category: CategoryKey;
  label: string;
  score: number;
  matchedTerms: string[];
}

interface ChunkScore {
  chunk: KnowledgeChunk;
  totalScore: number;
  categories: CategoryScore[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9₦]+/).filter(Boolean);
}

/**
 * Score a single chunk against all HNW categories.
 * Uses n-gram matching (unigrams + bigrams) against multi-word keywords.
 */
function scoreChunk(chunk: KnowledgeChunk): ChunkScore {
  const text = chunk.text.toLowerCase();
  const categories: CategoryScore[] = [];
  let totalScore = 0;

  for (const [key, cat] of Object.entries(HNW_CATEGORIES)) {
    const matchedTerms: string[] = [];
    let categoryScore = 0;

    for (const kw of cat.keywords) {
      const kwLower = kw.toLowerCase();
      // Count occurrences as a rough frequency indicator
      const re = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = text.match(re);
      if (matches) {
        matchedTerms.push(kw);
        // Score = count * weight, capped at 3 per keyword
        categoryScore += Math.min(matches.length, 3);
      }
    }

    if (categoryScore > 0) {
      const weighted = categoryScore * cat.weight;
      categories.push({
        category: key as CategoryKey,
        label: cat.label,
        score: weighted,
        matchedTerms,
      });
      totalScore += weighted;
    }
  }

  // Sort categories by score descending
  categories.sort((a, b) => b.score - a.score);

  return { chunk, totalScore, categories };
}

// ── Report Generation ────────────────────────────────────────────────────────

function generateReport(
  scored: ChunkScore[],
  topN: number,
  format: "table" | "json",
): string {
  if (format === "json") {
    return JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        totalChunks: scored.length,
        totalSources: new Set(scored.map((s) => s.chunk.source)).size,
        topChunks: scored.slice(0, topN).map((s) => ({
          source: s.chunk.source,
          url: s.chunk.url,
          type: s.chunk.type,
          totalScore: Math.round(s.totalScore * 100) / 100,
          topCategories: s.categories.slice(0, 3).map((c) => ({
            category: c.category,
            label: c.label,
            score: Math.round(c.score * 100) / 100,
            matchedTerms: c.matchedTerms.slice(0, 5),
          })),
          text: s.chunk.text.slice(0, 200) + (s.chunk.text.length > 200 ? "..." : ""),
        })),
        sourceRankings: aggregateBySource(scored),
        typeBreakdown: aggregateByType(scored),
        categoryDistribution: aggregateByCategory(scored),
      },
      null,
      2,
    );
  }

  // ── TABLE FORMAT ──
  const lines: string[] = [];
  lines.push("");
  lines.push("╔══════════════════════════════════════════════════════════════════════╗");
  lines.push("║        HNW MARKET RELEVANCE — COMPETITOR DATA CHUNK ANALYSIS       ║");
  lines.push("╚══════════════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Analyzed: ${new Date().toISOString()}`);
  lines.push(`  Total chunks scored: ${scored.length}`);
  lines.push(`  Total sources:       ${new Set(scored.map((s) => s.chunk.source)).size}`);
  lines.push("");

  // ── Section 1: Top-N Most Relevant Chunks ──
  lines.push("─".repeat(72));
  lines.push(`  🏆 TOP ${topN} MOST HNW-RELEVANT CHUNKS`);
  lines.push("─".repeat(72));
  lines.push("");

  for (let i = 0; i < Math.min(topN, scored.length); i++) {
    const s = scored[i];
    lines.push(`  #${(i + 1).toString().padStart(2, " ")} │ Source: ${s.chunk.source.padEnd(15)} │ Type: ${s.chunk.type.padEnd(12)} │ Score: ${s.totalScore.toFixed(1)}`);
    lines.push(`      │ URL:    ${s.chunk.url ?? "(no url)"}`);
    lines.push(`      │ Text:   ${s.chunk.text.slice(0, 100)}...`);

    // Top 3 categories for this chunk
    for (const cat of s.categories.slice(0, 3)) {
      const bar = "█".repeat(Math.min(Math.round(cat.score), 20));
      lines.push(`      │   ├─ ${cat.label.padEnd(32)} ${bar} ${cat.score.toFixed(1)}`);
    }

    if (s.categories.length > 3) {
      lines.push(`      │   └─ +${s.categories.length - 3} more categories`);
    }
    lines.push("");
  }

  // ── Section 2: Source-Level Rankings ──
  lines.push("─".repeat(72));
  lines.push("  📊 SOURCE-LEVEL RANKINGS (aggregated by competitor)");
  lines.push("─".repeat(72));
  lines.push("");

  const sourceRankings = aggregateBySource(scored);
  for (const sr of sourceRankings) {
    const bar = "█".repeat(Math.min(Math.round(sr.avgScore * 2), 20));
    lines.push(
      `  ${sr.source.padEnd(16)} │ Chunks: ${sr.count.toString().padStart(2)} │ Avg: ${sr.avgScore.toFixed(1).padStart(5)} │ Total: ${sr.totalScore.toFixed(1).padStart(6)} │ ${bar}`,
    );
  }
  lines.push("");

  // ── Section 3: Type-Level Breakdown ──
  lines.push("─".repeat(72));
  lines.push("  📂 CONTENT TYPE BREAKDOWN (by relevance score)");
  lines.push("─".repeat(72));
  lines.push("");

  const typeBreakdown = aggregateByType(scored);
  for (const tb of typeBreakdown) {
    const bar = "█".repeat(Math.min(Math.round(tb.avgScore * 2), 20));
    lines.push(
      `  ${tb.type.padEnd(14)} │ Chunks: ${tb.count.toString().padStart(2)} │ Avg: ${tb.avgScore.toFixed(1).padStart(5)} │ Total: ${tb.totalScore.toFixed(1).padStart(6)} │ ${bar}`,
    );
  }
  lines.push("");

  // ── Section 4: Thematic Category Distribution ──
  lines.push("─".repeat(72));
  lines.push("  🎯 THEMATIC CATEGORY DISTRIBUTION (across all chunks)");
  lines.push("─".repeat(72));
  lines.push("");

  const catDistribution = aggregateByCategory(scored);
  for (const cd of catDistribution) {
    const pct = scored.length > 0
      ? ((cd.chunkCount / scored.length) * 100).toFixed(0)
      : "0";
    const bar = "█".repeat(Math.min(cd.chunkCount * 2, 20));
    lines.push(
      `  ${cd.label.padEnd(34)} │ Chunks: ${cd.chunkCount.toString().padStart(2)} (${pct}%) │ Score: ${cd.totalScore.toFixed(1).padStart(6)} │ ${bar}`,
    );
  }
  lines.push("");

  // ── Section 5: Executive Summary ──
  lines.push("─".repeat(72));
  lines.push("  💡 EXECUTIVE SUMMARY");
  lines.push("─".repeat(72));
  lines.push("");

  const topSource = sourceRankings[0];
  const topChunk = scored[0];
  const dominantCategory = catDistribution[0];

  lines.push(`  Highest-value competitor: "${topSource?.source ?? "N/A"}" (avg score: ${topSource?.avgScore.toFixed(1) ?? 0})`);
  lines.push(`  Most relevant chunk:     "${topChunk?.chunk.source}" – "${topChunk?.chunk.text.slice(0, 60)}..."`);
  lines.push(`  Dominant HNW theme:      "${dominantCategory?.label ?? "N/A"}" (${dominantCategory?.chunkCount ?? 0} chunks)`);
  lines.push("");
  lines.push(`  Total HNW-relevant chunks: ${scored.filter((s) => s.totalScore > 0).length} / ${scored.length}`);
  lines.push(`  Zero-score chunks:         ${scored.filter((s) => s.totalScore === 0).length} / ${scored.length}`);
  lines.push("");
  lines.push("  Recommendations:");
  lines.push("  1. Prioritize chunks from highest-scoring sources for competitive positioning");
  lines.push("  2. Focus content strategy on top HNW themes (dominant categories)");
  lines.push("  3. Review zero-score chunks for potential missed HNW opportunities");
  lines.push("");

  return lines.join("\n");
}

// ── Aggregators ──────────────────────────────────────────────────────────────

interface SourceRanking {
  source: string;
  count: number;
  totalScore: number;
  avgScore: number;
}

function aggregateBySource(scored: ChunkScore[]): SourceRanking[] {
  const map = new Map<string, { count: number; totalScore: number }>();

  for (const s of scored) {
    const entry = map.get(s.chunk.source) ?? { count: 0, totalScore: 0 };
    entry.count++;
    entry.totalScore += s.totalScore;
    map.set(s.chunk.source, entry);
  }

  return [...map.entries()]
    .map(([source, data]) => ({
      source,
      count: data.count,
      totalScore: data.totalScore,
      avgScore: data.totalScore / data.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

interface TypeBreakdown {
  type: string;
  count: number;
  totalScore: number;
  avgScore: number;
}

function aggregateByType(scored: ChunkScore[]): TypeBreakdown[] {
  const map = new Map<string, { count: number; totalScore: number }>();

  for (const s of scored) {
    const entry = map.get(s.chunk.type) ?? { count: 0, totalScore: 0 };
    entry.count++;
    entry.totalScore += s.totalScore;
    map.set(s.chunk.type, entry);
  }

  return [...map.entries()]
    .map(([type, data]) => ({
      type,
      count: data.count,
      totalScore: data.totalScore,
      avgScore: data.totalScore / data.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

interface CategoryDistribution {
  category: CategoryKey;
  label: string;
  chunkCount: number;
  totalScore: number;
}

function aggregateByCategory(scored: ChunkScore[]): CategoryDistribution[] {
  const map = new Map<CategoryKey, { chunkCount: number; totalScore: number }>();

  // Initialize all categories
  for (const key of Object.keys(HNW_CATEGORIES) as CategoryKey[]) {
    map.set(key, { chunkCount: 0, totalScore: 0 });
  }

  for (const s of scored) {
    for (const cat of s.categories) {
      const entry = map.get(cat.category);
      if (entry) {
        entry.chunkCount++;
        entry.totalScore += cat.score;
      }
    }
  }

  return [...map.entries()]
    .map(([category, data]) => ({
      category,
      label: HNW_CATEGORIES[category].label,
      chunkCount: data.chunkCount,
      totalScore: data.totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

// ── CLI Entrypoint ───────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { topN: number; format: "table" | "json" } {
  let topN = 10;
  let format: "table" | "json" = "table";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--top" || argv[i] === "-n") {
      topN = parseInt(argv[++i] ?? "10", 10);
      if (!Number.isFinite(topN) || topN < 1) topN = 10;
    }
    if (argv[i] === "--json") {
      format = "json";
    }
  }

  return { topN, format };
}

function main() {
  const { topN, format } = parseArgs(process.argv.slice(2));

  console.log("🔍 Loading competitor knowledge base...");
  const data = loadData();
  console.log(`   Loaded ${data.length} chunks from ${new Set(data.map((d) => d.source)).size} sources\n`);

  console.log("📐 Scoring each chunk for HNW market relevance...");
  const scored = data
    .map(scoreChunk)
    .sort((a, b) => b.totalScore - a.totalScore);
  console.log(`   Scored ${scored.length} chunks\n`);

  const report = generateReport(scored, topN, format);
  console.log(report);
}

main();
