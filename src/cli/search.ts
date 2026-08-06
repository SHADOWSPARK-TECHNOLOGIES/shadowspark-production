#!/usr/bin/env tsx
/**
 * CLI search integration: semantic + keyword search against the knowledge base.
 *
 * Fallback chain:
 *   1. Hybrid pgvector retrieval (via rag-store.ts) — requires Gemini API
 *   2. File-based keyword retrieval (via rag/rag-store.ts) — uses firecrawl-knowledge.json
 *   3. Direct keyword match on raw JSON store — no dependencies
 *
 * Usage:
 *   pnpm search:kb "Nigerian regulatory shifts fintech 2026"
 *   pnpm search:kb --limit 10 "CBN crypto regulation"
 *   pnpm search:kb --format semantic "open banking Nigeria"
 *   pnpm search:kb --verbose "NITDA data protection"
 */
import fs from "fs";
import path from "path";

type Format = "semantic" | "hybrid" | "keyword";

interface Chunk {
  chunkId?: number;
  source: string;
  url?: string;
  type?: string;
  text?: string;
  pageType?: string;
  content?: string;
  verified?: boolean;
}

function parseArgs(argv: string[]): {
  query: string;
  limit: number;
  format: Format;
  verbose: boolean;
} {
  let query: string | undefined;
  let limit = 10;
  let format: Format = "hybrid";
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit" || arg === "-n") {
      limit = parseInt(argv[++i] ?? "10", 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 10;
      continue;
    }
    if (arg === "--format" || arg === "-f") {
      const val = argv[++i] as Format;
      if (val === "semantic" || val === "hybrid" || val === "keyword")
        format = val;
      continue;
    }
    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      continue;
    }
    if (!query) {
      query = arg;
    }
  }

  if (!query) {
    console.error(
      "Usage: tsx --env-file=.env src/cli/search.ts [--limit N] [--format semantic|hybrid|keyword] [--verbose] <query>",
    );
    process.exit(1);
  }

  return { query, limit, format, verbose };
}

/**
 * Load chunks from the file-based knowledge store (firecrawl-knowledge.json).
 */
function loadLocalKnowledge(): Chunk[] {
  try {
    const filePath = path.join(process.cwd(), "data", "firecrawl-knowledge.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Chunk[];
  } catch {
    return [];
  }
}

/**
 * Direct keyword search against the local JSON knowledge store.
 * No API dependencies — works even when Gemini / pgvector are down.
 */
function keywordSearch(
  query: string,
  limit: number,
): string[] {
  const chunks = loadLocalKnowledge();
  if (chunks.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);

  const scored = chunks
    .map((chunk) => {
      const text = (chunk.text ?? chunk.content ?? "").toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) score++;
      }
      // Boost verified entries
      if (chunk.verified) score += 2;
      return { chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(
    (c) =>
      `[Source: ${c.chunk.source}${c.chunk.url ? ` | ${c.chunk.url}` : ""}${c.chunk.type ? ` | ${c.chunk.type}` : ""}]\n${c.chunk.text ?? c.chunk.content ?? ""}`,
  );
}

async function main() {
  const { query, limit, format, verbose } = parseArgs(process.argv.slice(2));

  console.log(`\n🔍 Searching: "${query}"`);
  console.log(`   Format:    ${format}`);
  console.log(`   Limit:     ${limit}`);
  if (verbose) console.log(`   Verbose:   true`);
  console.log("");

  let results: string[] = [];

  // ── Attempt 1: Hybrid pgvector + file-based fallback ──
  if (format === "hybrid") {
    try {
      const { retrieveCompetitiveContext } = await import(
        "@/lib/knowledge/rag-store"
      );
      const context = await retrieveCompetitiveContext(query);
      if (context) {
        results = [context];
      }
    } catch (err) {
      if (verbose) {
        console.log(
          `⚠️  Hybrid pgvector retrieval failed: ${err instanceof Error ? err.message : err}`,
        );
        console.log("   Falling back to file-based keyword search...\n");
      }
    }

    // Fallback to file-based keyword search if pgvector returned nothing
    if (results.length === 0) {
      results = keywordSearch(query, limit);
    }
  }

  // ── Attempt 2: Pure semantic search (pgvector only) ──
  if (format === "semantic") {
    try {
      const { semanticSearch } = await import(
        "@/lib/knowledge/embedding-store"
      );
      results = await semanticSearch(query, limit);
    } catch (err) {
      if (verbose) {
        console.log(
          `⚠️  Semantic search failed: ${err instanceof Error ? err.message : err}`,
        );
        console.log("   Falling back to file-based keyword search...\n");
      }
      results = keywordSearch(query, limit);
    }
  }

  // ── Attempt 3: Direct keyword search (no API needed) ──
  if (format === "keyword") {
    results = keywordSearch(query, limit);
  }

  // ── Display ──
  if (results.length === 0) {
    console.log(
      "⚠️  No results found. The knowledge store may be empty or needs fresh data.",
    );
    console.log("");
    console.log("   To populate the knowledge base:");
    console.log("   $ pnpm engine:crawl    # scrapes competitor URLs");
    console.log("   $ pnpm engine:embed   # generates embeddings (needs Gemini API key)");
    console.log("");
    console.log("   Current data file: data/firecrawl-knowledge.json");
    const count = loadLocalKnowledge().length;
    console.log(`   Entries: ${count}`);
    process.exit(0);
  }

  console.log("─".repeat(60));
  for (const result of results) {
    console.log(result);
    console.log("─".repeat(60));
  }

  console.log(`\n📊 ${results.length} result(s) returned\n`);
}

main().catch((err) => {
  console.error("Search failed:", err);
  process.exit(1);
});
