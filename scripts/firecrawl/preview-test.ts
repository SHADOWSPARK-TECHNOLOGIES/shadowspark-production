import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FirecrawlDocument } from "@/lib/firecrawl";
import { getFirecrawlClient } from "@/lib/firecrawl";
import {
  buildNextBullets,
  cleanSignalText,
  deriveSignalConfidence,
  deriveVaultSignalBrief,
  rankSignalChunks,
  recommendBlocksForLayout,
  type SignalSourceChunk,
} from "@/lib/gcs/fetch-audit";

// Internal operator/dev-only evaluation tool. Do not expose this path publicly.

type PreviewCase = {
  url: string;
  slug?: string;
  businessName?: string;
  industry?: string;
};

type PreviewResult = {
  url: string;
  slug: string;
  businessName: string;
  industry: string;
  topSignals: Array<{
    title: string;
    score: number;
    url?: string;
    excerpt: string;
  }>;
  recommendedLayoutMode: string;
  recommendedBlocks: string[];
  heroSupportLine: string | null;
  proofLine: string | null;
  ctaSupportLine: string | null;
  buildNextBullets: string[];
  confidence: "high" | "medium" | "low";
  notes: string[];
};

const DEFAULT_CASES: PreviewCase[] = [
  {
    url: "https://www.1800gotjunk.com/us_en",
    slug: "got-junk",
    businessName: "1-800-GOT-JUNK?",
    industry: "Junk removal service",
  },
  {
    url: "https://linear.app",
    slug: "linear",
    businessName: "Linear",
    industry: "Software product",
  },
  {
    url: "https://www.charitywater.org",
    slug: "charity-water",
    businessName: "charity: water",
    industry: "Institution / nonprofit",
  },
];

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function inferBusinessName(testCase: PreviewCase, docs: FirecrawlDocument[]) {
  if (testCase.businessName) return testCase.businessName;

  const title =
    docs.find((doc) => typeof doc.metadata?.title === "string" && doc.metadata.title.trim())?.metadata?.title ??
    docs.find((doc) => typeof doc.metadata?.ogTitle === "string" && doc.metadata.ogTitle.trim())?.metadata?.ogTitle;

  if (typeof title === "string" && title.trim()) {
    return title.split("|")[0].split("—")[0].trim();
  }

  return slugify(testCase.url)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseArgs(argv: string[]): PreviewCase[] {
  const urls: string[] = [];
  let slug: string | undefined;
  let businessName: string | undefined;
  let industry: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") {
      const next = argv[index + 1];
      if (next) {
        urls.push(next);
        index += 1;
      }
      continue;
    }

    if (value === "--slug") {
      slug = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--business-name") {
      businessName = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--industry") {
      industry = argv[index + 1];
      index += 1;
      continue;
    }
  }

  if (urls.length === 0) return DEFAULT_CASES;

  return urls.map((url, urlIndex) => ({
    url,
    slug: urlIndex === 0 ? slug : undefined,
    businessName: urlIndex === 0 ? businessName : undefined,
    industry: urlIndex === 0 ? industry : undefined,
  }));
}

function splitMarkdownIntoChunks(document: FirecrawlDocument, docIndex: number): SignalSourceChunk[] {
  const markdown = document.markdown?.trim();
  if (!markdown) return [];

  const baseTitle =
    document.metadata?.title ??
    document.metadata?.ogTitle ??
    document.metadata?.url ??
    `Document ${docIndex + 1}`;
  const url = document.metadata?.url ?? document.metadata?.ogUrl;
  const sections = markdown
    .split(/\n(?=#{1,3}\s)/g)
    .map((section) => cleanSignalText(section))
    .filter((section) => section.length > 120);

  if (sections.length === 0) {
    return [
      {
        id: `doc-${docIndex}-0`,
        title: baseTitle,
        url,
        text: cleanSignalText(markdown).slice(0, 1600),
      },
    ];
  }

  return sections.map((section, sectionIndex) => {
    const lines = section.split(". ").map((line) => line.trim()).filter(Boolean);
    const title = lines[0]?.slice(0, 80) || `${baseTitle} section ${sectionIndex + 1}`;

    return {
      id: `doc-${docIndex}-${sectionIndex}`,
      title,
      url,
      text: section,
    };
  });
}

async function runPreview(testCase: PreviewCase): Promise<PreviewResult> {
  const client = getFirecrawlClient();
  const slug = testCase.slug ?? slugify(testCase.businessName ?? testCase.url);
  const crawl = await client.crawl(testCase.url, {
    limit: 3,
    maxDiscoveryDepth: 1,
    deduplicateSimilarURLs: true,
    sitemap: "include",
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: true,
    },
    timeout: 90,
    pollInterval: 2,
  });

  const docs = crawl.data.filter((doc) => typeof doc.markdown === "string" && doc.markdown.trim().length > 80);
  const businessName = inferBusinessName(testCase, docs);
  const industry = testCase.industry ?? "General business";
  const chunks = docs.flatMap((doc, docIndex) => splitMarkdownIntoChunks(doc, docIndex));
  const insights = rankSignalChunks({
    slug,
    businessName,
    niche: industry,
    chunks,
    k: 5,
  });
  const signalBrief = deriveVaultSignalBrief(insights, businessName, "Autonomous");
  const recommendedBlocks = recommendBlocksForLayout(signalBrief.layout);
  const buildBullets = buildNextBullets({
    insights,
    businessName,
    tierLabel: "Autonomous",
  });

  const notes = [
    `crawl status: ${crawl.status}`,
    `documents analyzed: ${docs.length}`,
    `chunks ranked: ${chunks.length}`,
  ];

  if (docs.length === 0) {
    notes.push("No markdown-rich documents were returned. Results are low confidence.");
  }

  if (insights.length < 3) {
    notes.push("Signal density is thin; layout recommendation may be unstable.");
  }

  return {
    url: testCase.url,
    slug,
    businessName,
    industry,
    topSignals: insights.map((insight) => ({
      title: insight.title,
      score: insight.score,
      url: insight.url,
      excerpt: insight.excerpt,
    })),
    recommendedLayoutMode: signalBrief.layout,
    recommendedBlocks,
    heroSupportLine: signalBrief.heroSupportLine,
    proofLine: signalBrief.proofLine,
    ctaSupportLine: signalBrief.ctaLine,
    buildNextBullets: buildBullets,
    confidence: deriveSignalConfidence(insights.length, insights[0]?.score),
    notes,
  };
}

async function main() {
  const previewCases = parseArgs(process.argv.slice(2));
  const results: PreviewResult[] = [];

  for (const previewCase of previewCases) {
    console.log(`Running Firecrawl preview for ${previewCase.url}`);
    try {
      const result = await runPreview(previewCase);
      results.push(result);
      console.log(
        JSON.stringify(
          {
            url: result.url,
            layout: result.recommendedLayoutMode,
            confidence: result.confidence,
            topSignals: result.topSignals.slice(0, 3).map((signal) => ({
              title: signal.title,
              score: signal.score,
            })),
          },
          null,
          2
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Preview failed for ${previewCase.url}: ${message}`);
      results.push({
        url: previewCase.url,
        slug: previewCase.slug ?? slugify(previewCase.url),
        businessName: previewCase.businessName ?? "Unknown",
        industry: previewCase.industry ?? "Unknown",
        topSignals: [],
        recommendedLayoutMode: "audit-summary",
        recommendedBlocks: recommendBlocksForLayout("audit-summary"),
        heroSupportLine: null,
        proofLine: null,
        ctaSupportLine: null,
        buildNextBullets: [],
        confidence: "low",
        notes: [`preview failed: ${message}`],
      });
    }
  }

  const outputDir = path.join(process.cwd(), "reports", "firecrawl-preview");
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = {
    generatedAt: new Date().toISOString(),
    internalOnly: true,
    cases: results,
  };
  const latestPath = path.join(outputDir, "latest.json");
  const timestampedPath = path.join(outputDir, `${timestamp}.json`);
  for (const outputPath of [latestPath, timestampedPath]) {
    await writeFile(
      outputPath,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8"
    );
  }

  const markdownSummaryPath = path.join(outputDir, "README.md");
  const markdownSummary = [
    "# Firecrawl Preview Reports",
    "",
    "Internal operator/dev-only evaluation artifacts.",
    "",
    `Latest run: \`${path.basename(timestampedPath)}\``,
    "",
    "Each JSON file contains:",
    "- URL",
    "- timestamp",
    "- top ranked signals",
    "- selected layout",
    "- confidence band",
    "- hero / proof / CTA support lines",
    "- build-next bullets",
    "",
  ].join("\n");
  await writeFile(markdownSummaryPath, `${markdownSummary}\n`, "utf8");

  console.log(`Saved preview report to ${latestPath}`);
  console.log(`Saved timestamped preview report to ${timestampedPath}`);
}

void main();
