import { Storage, type File } from "@google-cloud/storage";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";

import { requireEnv } from "@/lib/env";
import type { RagEmbeddingIndex } from "@/lib/rag/types";

const storage = new Storage();
const DEFAULT_BUCKET_NAME = "shadowspark-vault";

const PREFIX_CANDIDATES = [
  "audits",
  "reports",
  "intelligence",
  "crawls",
  "raw",
  "",
] as const;

type FileWithUpdatedAt = {
  file: File;
  updatedAt: number;
};

export type VaultInsight = {
  id: string;
  title: string;
  url?: string;
  excerpt: string;
  score: number;
};

export type SignalSourceChunk = {
  id: string;
  title?: string;
  url?: string;
  text: string;
  embedding?: number[];
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let a2 = 0;
  let b2 = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    a2 += a[i] * a[i];
    b2 += b[i] * b[i];
  }
  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom === 0 ? 0 : dot / denom;
}

export type VaultLayoutMode =
  | "proof-heavy"
  | "objection-handling"
  | "cta-comparison"
  | "audit-summary";

export type VaultSignalBrief = {
  layout: VaultLayoutMode;
  confidence: "high" | "medium" | "low";
  proofLine: string | null;
  objectionLine: string | null;
  ctaLine: string | null;
  heroSupportLine: string | null;
};

export function cleanSignalText(text: string) {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`~-]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveSignalConfidence(signalCount: number, topScore?: number): "high" | "medium" | "low" {
  if (signalCount >= 5 && (topScore ?? 0) >= 12) return "high";
  if (signalCount >= 3 && (topScore ?? 0) >= 7) return "medium";
  return "low";
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function getBucketName() {
  return process.env.VAULT_BUCKET || process.env.GCS_BUCKET_NAME || DEFAULT_BUCKET_NAME;
}

export function getFallbackAudit(slug: string) {
  return `# Intelligence Stream: ${slug}

> **Status:** Awaiting fresh cloud audit sync
> **Source:** ShadowSpark Genesis Vault

## Infrastructure Audit
- Crawl artifacts have not been published for this slug yet.
- The live page is ready to ingest markdown as soon as the worker uploads the next report.
- GCS retrieval is active and targeting the latest matching \`.md\` object.

## Revenue Leaks
- Follow-up speed remains exposed until the latest crawl snapshot is available.
- Messaging and CTA pathways should be re-evaluated against the most recent site content.
- Qualification friction will remain estimated until the next indexed report lands.

## AI Proposals
1. Re-run the Firecrawl job for this domain or slug.
2. Verify the worker is uploading markdown into the configured vault bucket.
3. Refresh this page after the next successful sync to render the newest audit narrative.
`;
}

function getUpdatedAt(file: File) {
  return new Date(file.metadata.updated || file.metadata.timeCreated || 0).getTime();
}

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function scoreFile(file: File, slug: string) {
  const normalizedName = file.name.toLowerCase();
  const normalizedSlug = normalizeSlug(slug);

  let score = 0;

  if (normalizedName.includes(`/${normalizedSlug}/`)) score += 5;
  if (normalizedName.includes(normalizedSlug)) score += 3;
  if (normalizedName.endsWith(".md")) score += 1;

  return score;
}

async function listMarkdownFilesForPrefix(prefix: string) {
  const [files] = await storage.bucket(getBucketName()).getFiles(prefix ? { prefix } : undefined);
  return files.filter((file) => file.name.endsWith(".md"));
}

async function readBucketFile(filePath: string) {
  const bucket = storage.bucket(getBucketName());
  const file = bucket.file(filePath);
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  const [contents] = await file.download();
  return contents.toString("utf8");
}

export async function loadLatestVaultIndex(slug?: string) {
  const normalizedSlug = slug ? normalizeSlug(slug) : null;
  
  if (normalizedSlug) {
    const slugPath = `indexes/${normalizedSlug}/latest.json`;
    const slugIndex = await readBucketFile(slugPath);
    if (slugIndex) {
      return JSON.parse(slugIndex) as RagEmbeddingIndex;
    }
  }

  const direct = await readBucketFile("indexes/latest.json");
  if (direct) {
    return JSON.parse(direct) as RagEmbeddingIndex;
  }

  const bucket = storage.bucket(getBucketName());
  const [files] = await bucket.getFiles({ prefix: "indexes/" });
  const indexFiles = files.filter((file) => file.name.endsWith("/index.json") || file.name.endsWith(".json"));

  if (indexFiles.length === 0) {
    return null;
  }

  indexFiles.sort((left, right) => getUpdatedAt(right) - getUpdatedAt(left));
  const [contents] = await bucket.file(indexFiles[0].name).download();
  return JSON.parse(contents.toString("utf8")) as RagEmbeddingIndex;
}

function scoreChunk(text: string, tokens: string[], slug: string) {
  const normalizedText = cleanSignalText(text).toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (normalizedText.includes(token)) {
      score += token.length > 6 ? 3 : 2;
    }
  }

  if (slug && normalizedText.includes(slug)) {
    score += 4;
  }

  return score;
}

function buildExcerpt(text: string) {
  const normalized = cleanSignalText(text);
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

function countMatches(text: string, keywords: readonly string[]) {
  const normalized = cleanSignalText(text).toLowerCase();
  return keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
}

function strongestLine(
  insights: VaultInsight[],
  keywords: readonly string[],
  fallback: ((insight: VaultInsight) => string) | null = null
) {
  const ranked = insights
    .map((insight) => ({
      insight,
      weight: insight.score + countMatches(`${insight.title} ${insight.excerpt}`, keywords) * 4,
    }))
    .sort((left, right) => right.weight - left.weight);

  const winner = ranked[0]?.insight;
  if (!winner) return null;

  return fallback ? fallback(winner) : winner.excerpt;
}

export function deriveVaultSignalBrief(
  insights: VaultInsight[],
  businessName: string,
  tierLabel: string
): VaultSignalBrief {
  const proofKeywords = ["result", "client", "revenue", "growth", "conversion", "proof", "trusted"];
  const objectionKeywords = ["slow", "manual", "friction", "delay", "drop", "leak", "bottleneck"];
  const ctaKeywords = ["book", "call", "demo", "contact", "whatsapp", "quote", "pricing", "get started"];
  const strongCtaKeywords = ["book", "demo", "contact", "quote", "pricing", "get started"];

  const proofScore = insights.reduce(
    (sum, insight) => sum + countMatches(`${insight.title} ${insight.excerpt}`, proofKeywords),
    0
  );
  const objectionScore = insights.reduce(
    (sum, insight) => sum + countMatches(`${insight.title} ${insight.excerpt}`, objectionKeywords),
    0
  );
  const ctaScore = insights.reduce(
    (sum, insight) => sum + countMatches(`${insight.title} ${insight.excerpt}`, ctaKeywords),
    0
  );
  const strongCtaScore = insights.reduce(
    (sum, insight) => sum + countMatches(`${insight.title} ${insight.excerpt}`, strongCtaKeywords),
    0
  );
  const confidence = deriveSignalConfidence(insights.length, insights[0]?.score);

  const layout: VaultLayoutMode =
    confidence === "low"
      ? "audit-summary"
      : strongCtaScore > 0 && ctaScore >= proofScore && ctaScore >= objectionScore
      ? "cta-comparison"
      : proofScore >= objectionScore && proofScore >= 2
      ? "proof-heavy"
      : objectionScore >= 2
        ? "objection-handling"
        : "audit-summary";

  const proofLine =
    confidence === "low"
      ? `Live crawl confidence is still low, so proof should stay conservative until a denser audit lands for ${businessName}.`
      : strongestLine(insights, proofKeywords, (insight) =>
          `${businessName} has a clear proof angle: ${buildExcerpt(insight.excerpt)}`
        );
  const objectionLine =
    confidence === "low"
      ? `Keep the objection framing broad: follow-up drag, unclear CTA paths, and limited proof density still need confirmation.`
      : strongestLine(insights, objectionKeywords, (insight) =>
          `Main objection to neutralize: ${buildExcerpt(insight.excerpt)}`
        );
  const ctaLine =
    confidence === "low"
      ? `Use a conservative next step: book a ${tierLabel.toLowerCase()} walkthrough before making stronger CTA claims.`
      : strongestLine(insights, ctaKeywords, (insight) =>
          `Best close path: use ${tierLabel.toLowerCase()} as the next step because ${buildExcerpt(insight.excerpt)}`
        );
  const heroSupportLine =
    confidence === "low"
      ? `The current crawl gives a partial read on ${businessName}, so this page stays in audit-summary mode until stronger signal density lands.`
      : strongestLine(
          insights,
          [...proofKeywords, ...objectionKeywords],
          (insight) => `The strongest live signal for ${businessName} is ${buildExcerpt(insight.excerpt).toLowerCase()}`
        );

  return {
    layout,
    confidence,
    proofLine,
    objectionLine,
    ctaLine,
    heroSupportLine,
  };
}

export function recommendBlocksForLayout(layout: VaultLayoutMode): string[] {
  if (layout === "proof-heavy") {
    return ["hero-proof-strip", "ranked-signals", "conversion-bridge"];
  }

  if (layout === "objection-handling") {
    return ["pain-summary", "objection-blocks", "build-next-cta"];
  }

  if (layout === "cta-comparison") {
    return ["decision-strip", "cta-support", "build-next-cta"];
  }

  return ["audit-summary", "ranked-signals", "build-next-cta"];
}

export function buildNextBullets(args: {
  insights: VaultInsight[];
  businessName: string;
  tierLabel: string;
}): string[] {
  const confidence = deriveSignalConfidence(args.insights.length, args.insights[0]?.score);
  if (confidence === "low") {
    return [
      `Keep the audit for ${args.businessName} in summary mode until a stronger crawl produces denser proof and CTA signals.`,
      "Use the next conversation to verify objection patterns instead of overstating them in-page.",
      `Offer a ${args.tierLabel.toLowerCase()} walkthrough as the next step rather than a hard sell.`,
    ];
  }

  const proof = strongestLine(args.insights, ["result", "client", "growth", "conversion"]);
  const objection = strongestLine(args.insights, ["slow", "manual", "delay", "friction", "leak"]);
  const cta = strongestLine(args.insights, ["book", "call", "demo", "contact", "quote"]);

  return [
    proof
      ? `Lead with proof for ${args.businessName}: ${buildExcerpt(proof)}`
      : `Anchor the presentation around visible conversion and trust wins for ${args.businessName}.`,
    objection
      ? `Neutralize the main friction point: ${buildExcerpt(objection)}`
      : "Reduce operator drag by tightening response speed and CTA routing.",
    cta
      ? `Use the ${args.tierLabel.toLowerCase()} path as the close because ${buildExcerpt(cta)}`
      : `Close with a ${args.tierLabel.toLowerCase()} walkthrough and a clear next-step CTA.`,
  ];
}

export function rankSignalChunks(args: {
  slug: string;
  businessName?: string;
  niche?: string;
  chunks: SignalSourceChunk[];
  k?: number;
  queryEmbedding?: number[];
}): VaultInsight[] {
  const slug = normalizeSlug(args.slug);
  const queryTokens = Array.from(
    new Set(
      tokenize([args.slug, args.businessName, args.niche, "revenue leak infrastructure ai proposal"]
        .filter(Boolean)
        .join(" "))
    )
  );

  return args.chunks
    .map((chunk) => {
      const keywordScore = scoreChunk(`${chunk.title ?? ""}\n${chunk.text}`, queryTokens, slug);
      let semanticScore = 0;

      if (args.queryEmbedding && chunk.embedding) {
        // Boost semantic score to be competitive with keyword scores (which are around 2-20)
        semanticScore = cosineSimilarity(args.queryEmbedding, chunk.embedding) * 15;
      }

      return {
        chunk: {
          ...chunk,
          title: chunk.title ? cleanSignalText(chunk.title) : undefined,
          text: cleanSignalText(chunk.text),
        },
        score: Math.max(keywordScore, semanticScore),
      };
    })
    .filter((entry) => entry.score > 0 && entry.chunk.text.length > 80)
    .sort((left, right) => right.score - left.score)
    .slice(0, args.k ?? 4)
    .map((entry) => ({
      id: entry.chunk.id,
      title: entry.chunk.title ?? "Indexed audit signal",
      url: entry.chunk.url,
      excerpt: buildExcerpt(entry.chunk.text),
      score: entry.score,
    }));
}

export async function fetchVaultInsights(args: {
  slug: string;
  businessName?: string;
  niche?: string;
  k?: number;
}): Promise<VaultInsight[]> {
  try {
    const index = await loadLatestVaultIndex(args.slug);
    if (!index || index.chunks.length === 0) {
      return [];
    }

    const queryText = [args.slug, args.businessName, args.niche, "revenue leak infrastructure ai proposal"]
      .filter(Boolean)
      .join(" ");

    let queryEmbedding: number[] | undefined;
    try {
      const google = createGoogleGenerativeAI({ apiKey: requireEnv("GEMINI_API_KEY") });
      const model = google.textEmbeddingModel(index.embeddingModel || "gemini-embedding-001");
      const { embedding } = await embed({
        model,
        value: queryText,
      });
      queryEmbedding = embedding;
    } catch (embedError) {
      console.warn("[gcs] query embedding failed, falling back to keyword search", embedError);
    }

    return rankSignalChunks({
      slug: args.slug,
      businessName: args.businessName,
      niche: args.niche,
      chunks: index.chunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        url: chunk.url,
        text: chunk.text,
        embedding: chunk.embedding,
      })),
      k: args.k,
      queryEmbedding,
    });
  } catch (error) {
    console.error("[gcs] failed to fetch vault insights", {
      bucket: getBucketName(),
      slug: args.slug,
      error,
    });
    return [];
  }
}

export async function fetchLatestAuditMarkdown(slug: string): Promise<string> {
  const normalizedSlug = normalizeSlug(slug);
  const bucket = storage.bucket(getBucketName());

  try {
    const canonicalLatest = await readBucketFile(`audits/${normalizedSlug}/latest.md`);
    if (canonicalLatest) {
      return canonicalLatest;
    }

    const candidateFiles = await Promise.all(
      PREFIX_CANDIDATES.map(async (rootPrefix) => {
        const slugPrefix = rootPrefix ? `${rootPrefix}/${normalizedSlug}` : normalizedSlug;
        const rootFiles = await listMarkdownFilesForPrefix(slugPrefix);

        if (rootFiles.length > 0) {
          return rootFiles;
        }

        if (!rootPrefix) {
          return listMarkdownFilesForPrefix("");
        }

        return listMarkdownFilesForPrefix(`${rootPrefix}/`);
      })
    );

    const rankedFiles = candidateFiles
      .flat()
      .filter((file, index, files) => files.findIndex((candidate) => candidate.name === file.name) === index)
      .filter((file) => file.name.toLowerCase().includes(normalizedSlug) || !normalizedSlug)
      .map<FileWithUpdatedAt>((file) => ({
        file,
        updatedAt: getUpdatedAt(file),
      }))
      .sort((left, right) => {
        const scoreDelta = scoreFile(right.file, normalizedSlug) - scoreFile(left.file, normalizedSlug);
        if (scoreDelta !== 0) return scoreDelta;
        return right.updatedAt - left.updatedAt;
      });

    const latestMatch = rankedFiles[0]?.file;

    if (!latestMatch) {
      return getFallbackAudit(slug);
    }

    const [contents] = await bucket.file(latestMatch.name).download();
    return contents.toString("utf8");
  } catch (error) {
    console.error("[gcs] failed to fetch latest audit markdown", {
      bucket: bucket.name,
      slug: normalizedSlug,
      error,
    });
    return getFallbackAudit(slug);
  }
}
