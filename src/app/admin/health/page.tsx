export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type HealthApiResponse = {
  status: string;
  vectorCount?: number;
  threshold?: number;
  timestamp?: string;
  message?: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function getHealthSummary(): Promise<HealthApiResponse> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/health`, { cache: "no-store" });
    const data = (await response.json()) as HealthApiResponse;
    if (!response.ok) {
      return {
        status: "error",
        message: data.message || "Failed to load health summary.",
      };
    }
    return data;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to reach /api/health.",
    };
  }
}

async function getPrismaConnectionStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "Connected",
      detail: "Prisma connection test passed.",
    };
  } catch (error) {
    return {
      status: "Unavailable",
      detail: error instanceof Error ? error.message : "Prisma connection test failed.",
    };
  }
}

async function getRecentFirecrawlErrors() {
  try {
    const logPath = path.join(process.cwd(), "logs", "production-firecrawl-errors.log");
    const raw = await fs.readFile(logPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-5)
      .reverse();
  } catch {
    return [] as string[];
  }
}

async function getSemanticCentroidDistance() {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ distance: number | null }>>(
      `WITH centroid AS (
         SELECT AVG(embedding) AS centroid
         FROM "KnowledgeEmbedding"
       )
       SELECT (ke.embedding <=> centroid.centroid) AS distance
       FROM "KnowledgeEmbedding" ke
       CROSS JOIN centroid
       ORDER BY ke."updatedAt" DESC
       LIMIT 1`
    );

    const distance = result[0]?.distance;
    return typeof distance === "number" ? distance : null;
  } catch {
    return null;
  }
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "zinc" }) {
  const toneClasses = {
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    red: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    zinc: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

export default async function AdminHealthPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role?.toLowerCase();
  if (!session || userRole !== "admin") {
    redirect("/login");
  }

  const [health, proxyStatus, firecrawlErrors, centroidDistance] = await Promise.all([
    getHealthSummary(),
    getPrismaConnectionStatus(),
    getRecentFirecrawlErrors(),
    getSemanticCentroidDistance(),
  ]);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
            ShadowSpark Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">System Health</h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Operational view of vector readiness, database connectivity, Firecrawl failure logs, and semantic centroid drift.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Vector Count</p>
              <StatusPill
                label={health.status === "ok" ? "Healthy" : "Error"}
                tone={health.status === "ok" ? "green" : "red"}
              />
            </div>
            <p className="mt-5 text-4xl font-black text-white">{health.vectorCount ?? 0}</p>
            <p className="mt-2 text-sm text-zinc-400">Threshold: {health.threshold ?? 0.6}</p>
            <p className="mt-3 text-xs text-zinc-500">{health.timestamp ?? health.message ?? "No health timestamp available."}</p>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Cloud SQL Auth Proxy</p>
              <StatusPill
                label={proxyStatus.status}
                tone={proxyStatus.status === "Connected" ? "green" : "red"}
              />
            </div>
            <p className="mt-5 text-2xl font-bold text-white">{proxyStatus.status}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{proxyStatus.detail}</p>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Semantic Centroid</p>
              <StatusPill
                label={centroidDistance === null ? "Unknown" : "Measured"}
                tone={centroidDistance === null ? "amber" : "green"}
              />
            </div>
            <p className="mt-5 text-4xl font-black text-white">
              {centroidDistance === null ? "N/A" : centroidDistance.toFixed(4)}
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Distance of the latest knowledge-base embedding from the current semantic centroid.
            </p>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Firecrawl Errors</p>
              <StatusPill
                label={firecrawlErrors.length > 0 ? `${firecrawlErrors.length} entries` : "No entries"}
                tone={firecrawlErrors.length > 0 ? "amber" : "zinc"}
              />
            </div>
            <p className="mt-5 text-4xl font-black text-white">{firecrawlErrors.length}</p>
            <p className="mt-3 text-sm text-zinc-400">Recent lines loaded from `/logs/production-firecrawl-errors.log`.</p>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Last 5 Firecrawl Errors</p>
              <h2 className="mt-2 text-xl font-bold text-white">Ingestion Failure Log</h2>
            </div>
            <StatusPill
              label={firecrawlErrors.length > 0 ? "Attention" : "Clear"}
              tone={firecrawlErrors.length > 0 ? "amber" : "green"}
            />
          </div>

          {firecrawlErrors.length > 0 ? (
            <div className="space-y-3">
              {firecrawlErrors.map((entry) => (
                <div key={entry} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{entry}</pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-8 text-center text-sm text-zinc-500">
              No Firecrawl error entries were found.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
