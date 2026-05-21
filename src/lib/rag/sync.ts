import fs from "node:fs/promises";
import path from "node:path";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Storage } from "@google-cloud/storage";
import { embedMany } from "ai";

import { requireEnv } from "@/lib/env";
import {
  buildNextBullets,
  cleanSignalText,
  deriveSignalConfidence,
  deriveVaultSignalBrief,
  rankSignalChunks,
} from "@/lib/gcs/fetch-audit";
import { getFirecrawlClient } from "@/lib/firecrawl";
import type { FirecrawlDocument } from "@/lib/firecrawl";
import type { RagEmbeddingChunk, RagEmbeddingIndex } from "@/lib/rag/types";

const storage = new Storage();

function chunkMarkdown(markdown: string, maxChars: number): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paras = normalized
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const p of paras) {
    if (!current) {
      current = p;
      continue;
    }

    if (current.length + 2 + p.length <= maxChars) {
      current += "\n\n" + p;
      continue;
    }

    chunks.push(current);
    current = p;
  }

  if (current) chunks.push(current);
  return chunks;
}

function stableChunkId(input: string): string {
  // Not cryptographic; good enough for deterministic chunk IDs in a committed JSON file.
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `c_${(hash >>> 0).toString(16)}`;
}

function slugifySegment(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildVaultRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function uploadVaultArtifacts(args: {
  bucketName: string;
  runId: string;
  rootUrl: string;
  slug?: string;
  docs: Array<{ url?: string; title?: string; markdown: string }>;
  index: RagEmbeddingIndex;
  auditMarkdown: string;
}) {
  const bucket = storage.bucket(args.bucketName);
  const normalizedSlug = args.slug?.trim().toLowerCase();
  const runAuditName = normalizedSlug
    ? `audits/${normalizedSlug}/${args.runId}/audit.md`
    : `raw/${args.runId}/audit.md`;
  const latestAuditName = normalizedSlug ? `audits/${normalizedSlug}/latest.md` : "raw/latest.md";

  await Promise.all([
    bucket.file(runAuditName).save(args.auditMarkdown, {
      contentType: "text/markdown; charset=utf-8",
      resumable: false,
      metadata: {
        metadata: {
          rootUrl: args.rootUrl,
          slug: normalizedSlug || "",
          runId: args.runId,
          artifact: "audit-summary",
        },
      },
    }),
    bucket.file(latestAuditName).save(args.auditMarkdown, {
      contentType: "text/markdown; charset=utf-8",
      resumable: false,
      metadata: {
        metadata: {
          rootUrl: args.rootUrl,
          slug: normalizedSlug || "",
          runId: args.runId,
          artifact: "latest-audit-summary",
        },
      },
    }),
  ]);

  await Promise.all(
    args.docs.map(async (doc, index) => {
      const baseName = slugifySegment(doc.url || doc.title || `document-${index + 1}`) || `document-${index + 1}`;
      
      // If we have a slug, we prefer putting it in a dedicated directory
      const objectName = normalizedSlug 
        ? `audits/${normalizedSlug}/${args.runId}/${baseName}.md`
        : `raw/${args.runId}/${String(index + 1).padStart(3, "0")}-${baseName}.md`;

      await bucket.file(objectName).save(doc.markdown, {
        contentType: "text/markdown; charset=utf-8",
        resumable: false,
        metadata: {
          metadata: {
            rootUrl: args.rootUrl,
            sourceUrl: doc.url || "",
            title: doc.title || "",
            slug: normalizedSlug || "",
          },
        },
      });
    })
  );

  const indexPayload = JSON.stringify(args.index, null, 2) + "\n";
  
  // Index pathing: prefer slug-based indexes
  const runIndexName = normalizedSlug
    ? `indexes/${normalizedSlug}/${args.runId}.json`
    : `indexes/${args.runId}/index.json`;
  
  const latestIndexName = normalizedSlug
    ? `indexes/${normalizedSlug}/latest.json`
    : `indexes/latest.json`;

  await bucket.file(runIndexName).save(indexPayload, {
    contentType: "application/json; charset=utf-8",
    resumable: false,
    metadata: {
      metadata: {
        rootUrl: args.rootUrl,
        slug: normalizedSlug || "",
      },
    },
  });

  await bucket.file(latestIndexName).save(indexPayload, {
    contentType: "application/json; charset=utf-8",
    resumable: false,
    metadata: {
      metadata: {
        rootUrl: args.rootUrl,
        runId: args.runId,
        slug: normalizedSlug || "",
      },
    },
  });
}

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferBusinessName(args: {
  slug: string;
  rootUrl: string;
  docs: Array<{ url?: string; title?: string; markdown: string }>;
}) {
  const title = args.docs.find((doc) => doc.title?.trim())?.title?.trim();
  if (title) {
    return title.split("|")[0]?.split("—")[0]?.trim() || title;
  }

  try {
    const hostname = new URL(args.rootUrl).hostname.replace(/^www\./, "");
    const hostLabel = hostname.split(".")[0];
    if (hostLabel) {
      return hostLabel
        .split("-")
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
    }
  } catch {
    // Fall through to slug prettification.
  }

  return prettifySlug(args.slug);
}

function buildAuditMarkdown(args: {
  slug: string;
  runId: string;
  rootUrl: string;
  docs: Array<{ url?: string; title?: string; markdown: string }>;
  chunks: RagEmbeddingChunk[];
}) {
  const businessName = inferBusinessName({
    slug: args.slug,
    rootUrl: args.rootUrl,
    docs: args.docs,
  });
  const insights = rankSignalChunks({
    slug: args.slug,
    businessName,
    chunks: args.chunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      url: chunk.url,
      text: chunk.text,
      embedding: chunk.embedding,
    })),
    k: 5,
  });
  const confidence = deriveSignalConfidence(insights.length, insights[0]?.score);
  const signalBrief = deriveVaultSignalBrief(insights, businessName, "Autonomous");
  const nextBullets = buildNextBullets({
    insights,
    businessName,
    tierLabel: "Autonomous",
  });

  const sourceSection =
    args.docs.length > 0
      ? args.docs
          .slice(0, 5)
          .map((doc, index) => {
            const label = doc.title?.trim() || doc.url || `Source ${index + 1}`;
            return `- ${label}${doc.url ? ` (${doc.url})` : ""}`;
          })
          .join("\n")
      : "- No markdown-rich source documents were available in this run.";

  const signalSection =
    insights.length > 0
      ? insights.map((insight) => `1. **${insight.title}**: ${insight.excerpt}`).join("\n")
      : "1. Awaiting stronger signal density from the next crawl run.";

  const nextSection =
    nextBullets.length > 0
      ? nextBullets.map((bullet) => `- ${bullet}`).join("\n")
      : "- Book the next review pass once a denser crawl lands.";

  return [
    `# Intelligence Stream: ${businessName}`,
    "",
    `> **Slug:** ${args.slug}`,
    `> **Run ID:** ${args.runId}`,
    `> **Root URL:** ${args.rootUrl}`,
    `> **Confidence:** ${confidence}`,
    "",
    "## Crawl Snapshot",
    `- Documents analyzed: ${args.docs.length}`,
    `- Ranked chunks indexed: ${args.chunks.length}`,
    `- Recommended layout: ${signalBrief.layout}`,
    "",
    "## Operator Readout",
    signalBrief.heroSupportLine ?? `The latest crawl for ${businessName} is available for review.`,
    "",
    "## Proof Line",
    signalBrief.proofLine ?? `Proof density is still forming for ${businessName}.`,
    "",
    "## Objection Line",
    signalBrief.objectionLine ?? "The strongest objection pattern will emerge after a denser crawl.",
    "",
    "## CTA Line",
    signalBrief.ctaLine ?? "Use a conservative walkthrough CTA until stronger signals land.",
    "",
    "## Top Signals",
    signalSection,
    "",
    "## Sources Reviewed",
    sourceSection,
    "",
    "## What To Build Next",
    nextSection,
    "",
  ].join("\n");
}

/**
 * Split a Firecrawl document's markdown into semantic chunks.
 * Uses heading-based splitting for headings 1-3, with a paragraph-based
 * fallback when no headings are present. This fixes the "1-chunk" issue
 * where pages without H1 tags produced only a single chunk.
 */
function splitDocIntoChunks(
  doc: FirecrawlDocument,
  docIndex: number,
  maxChunkChars: number,
): Array<{ url?: string; title?: string; text: string }> {
  const markdown = doc.markdown?.trim();
  if (!markdown) return [];

  const baseTitle: string =
    doc.metadata?.title ??
    doc.metadata?.ogTitle ??
    doc.metadata?.url ??
    `Document ${docIndex + 1}`;
  const url = doc.metadata?.url ?? doc.metadata?.ogUrl;

  // Primary split: headings 1-3
  const headingChunks = markdown
    .split(/\n(?=#{1,3}\s)/g)
    .map((s) => cleanSignalText(s))
    .filter((s) => s.length > 80);

  // If heading split produced nothing useful, fall back to paragraph-based chunking
  if (headingChunks.length === 0) {
    // Split by double-newline paragraphs, merge up to maxChunkChars
    const paragraphs = markdown
      .split(/\n{2,}/g)
      .map((p) => cleanSignalText(p))
      .filter((p) => p.length > 80);

    if (paragraphs.length === 0) {
      // Last resort: use the full text truncated
      return [
        {
          url,
          title: baseTitle,
          text: cleanSignalText(markdown).slice(0, maxChunkChars),
        },
      ];
    }

    const merged: Array<{ url?: string; title?: string; text: string }> = [];
    let current = "";
    for (const p of paragraphs) {
      if (!current) {
        current = p;
        continue;
      }
      if (current.length + 2 + p.length <= maxChunkChars) {
        current += "\n\n" + p;
        continue;
      }
      merged.push({ url, title: baseTitle, text: current });
      current = p;
    }
    if (current) merged.push({ url, title: baseTitle, text: current });
    return merged;
  }

  // Heading-based chunks succeeded
  return headingChunks.map((text, sectionIndex) => {
    const lines = text.split(". ").map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.slice(0, 80) || `${baseTitle} section ${sectionIndex + 1}`;
    return { url, title, text };
  });
}

export async function runRagSync(args: {
  rootUrl: string;
  slug?: string;
  limit: number;
  maxChunkChars: number;
}): Promise<{ outPath: string; chunks: number; documents: number; bucketName?: string; runId: string }> {
  const runId = buildVaultRunId();

  // Primary: Firecrawl full crawl (multi-page, proper chunking)
  // Fallback: Jina single-page scrape with improved chunking (when credits exhausted or API unavailable)
  let docs: FirecrawlDocument[] = [];
  let usedFirecrawl = false;

  try {
    console.log(`[rag:sync] Running full Firecrawl crawl for ${args.rootUrl}`);
    const client = getFirecrawlClient();
    const crawl = await client.crawl(args.rootUrl, {
      limit: args.limit,
      maxDiscoveryDepth: 1,
      deduplicateSimilarURLs: true,
      sitemap: "include",
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
      timeout: 120,
      pollInterval: 2,
    });

    docs = crawl.data.filter(
      (doc): doc is FirecrawlDocument =>
        typeof doc.markdown === "string" && doc.markdown.trim().length > 80,
    );

    console.log(
      `[rag:sync] Firecrawl returned ${crawl.data.length} documents, ${docs.length} with substantial markdown`,
    );
    usedFirecrawl = true;
  } catch (firecrawlError) {
    const msg = firecrawlError instanceof Error ? firecrawlError.message : String(firecrawlError);
    console.warn(`[rag:sync] Firecrawl failed (${msg}), falling back to Jina single-page scrape`);
    console.warn(`[rag:sync] To fix: top up Firecrawl credits or set a lower --limit`);

    try {
      const response = await fetch(`https://r.jina.ai/${args.rootUrl}`, {
        headers: { 'Accept': 'text/plain' }
      });
      const markdown = await response.text();
      docs = [{
        markdown,
        metadata: { url: args.rootUrl, title: args.slug ?? args.rootUrl },
      }];
      console.log(`[rag:sync] Jina fallback returned ${markdown.length} chars`);
    } catch (jinaError) {
      console.error(`[rag:sync] Jina fallback also failed:`, jinaError);
      // Write empty index so the system doesn't hang
      const outDir = path.join(process.cwd(), "data", "rag");
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, "index.json");
      await fs.writeFile(outPath, JSON.stringify({
        version: 1, createdAt: new Date().toISOString(),
        embeddingModel: "gemini-embedding-001", source: { rootUrl: args.rootUrl }, chunks: [],
      }, null, 2) + "\n", "utf8");
      return { outPath, chunks: 0, documents: 0, bucketName: undefined, runId };
    }
  }

  // Split each document into semantic chunks, fixing the "1-chunk" issue
  const chunkInputs: Array<{ url?: string; title?: string; text: string }> = [];
  for (let docIndex = 0; docIndex < docs.length; docIndex++) {
    const docChunks = splitDocIntoChunks(docs[docIndex], docIndex, args.maxChunkChars);
    chunkInputs.push(...docChunks);
  }

  if (chunkInputs.length === 0) {
    console.warn(`[rag:sync] No chunks extracted from any document for ${args.rootUrl}`);
    const outDir = path.join(process.cwd(), "data", "rag");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, "index.json");
    await fs.writeFile(outPath, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), embeddingModel: "gemini-embedding-001", source: { rootUrl: args.rootUrl }, chunks: [] }, null, 2) + "\n", "utf8");
    return { outPath, chunks: 0, documents: 0, bucketName: undefined, runId };
  }

  console.log(`[rag:sync] Generated ${chunkInputs.length} chunks from ${docs.length} documents`);

  const google = createGoogleGenerativeAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  const embeddingModel = "gemini-embedding-001";
  const model = google.textEmbeddingModel(embeddingModel);

  const { embeddings } = await embedMany({
    model,
    values: chunkInputs.map((c) => c.text),
  });

  const chunks: RagEmbeddingChunk[] = chunkInputs.map((c, i) => {
    const key = `${c.url ?? "unknown"}\n${c.title ?? ""}\n${c.text}`;
    return {
      id: stableChunkId(key),
      url: c.url,
      title: c.title,
      text: c.text,
      embedding: embeddings[i],
    };
  });

  const index: RagEmbeddingIndex = {
    version: 1,
    createdAt: new Date().toISOString(),
    embeddingModel,
    source: { rootUrl: args.rootUrl },
    chunks,
  };
  const normalizedSlug = args.slug?.trim().toLowerCase() || slugifySegment(args.rootUrl) || "audit";
  const auditMarkdown = buildAuditMarkdown({
    slug: normalizedSlug,
    runId,
    rootUrl: args.rootUrl,
    docs: docs.map((d) => ({
      url: d.metadata?.url ?? args.rootUrl,
      title: d.metadata?.title ?? d.metadata?.ogTitle ?? args.slug ?? args.rootUrl,
      markdown: d.markdown ?? "",
    })),
    chunks,
  });

  const outDir = path.join(process.cwd(), "data", "rag");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "index.json");
  await fs.writeFile(outPath, JSON.stringify(index, null, 2) + "\n", "utf8");

  const bucketName = process.env.VAULT_BUCKET?.trim();
  if (bucketName) {
    await uploadVaultArtifacts({
      bucketName,
      runId,
      rootUrl: args.rootUrl,
      slug: normalizedSlug,
      docs: docs.map((d) => ({
        url: d.metadata?.url ?? args.rootUrl,
        title: d.metadata?.title ?? d.metadata?.ogTitle ?? args.slug ?? args.rootUrl,
        markdown: d.markdown ?? "",
      })),
      index,
      auditMarkdown,
    });
  }

  return { outPath, chunks: chunks.length, documents: docs.length, bucketName: bucketName || undefined, runId };
}
