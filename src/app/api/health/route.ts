import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
const THRESHOLD = 0.6;

const DB_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export async function GET() {
  const checks = {
    status: "ok" as "ok" | "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latencyMs: 0,
    version: process.env.npm_package_version || "1.0.0",
    vectorCount: 0,
    threshold: THRESHOLD,
    services: {
      database: "unknown" as "connected" | "disconnected" | "unknown",
      redis: "unknown" as "connected" | "disconnected" | "unknown",
      aiAssist: "unknown" as "connected" | "disconnected" | "degraded" | "unconfigured" | "unknown",
    },
    platform: {
      provider: process.env.NETLIFY ? "netlify" : process.env.RENDER ? "render" : "local",
      commit: (process.env.COMMIT_REF || process.env.RENDER_GIT_COMMIT || "HEAD").slice(0, 7),
      env: process.env.CONTEXT || process.env.NODE_ENV || "development",
    },
  };

  const dbStart = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS, "Database ping timeout");
    checks.services.database = "connected";
    checks.latencyMs = Date.now() - dbStart;
  } catch {
    checks.services.database = "disconnected";
    checks.latencyMs = Date.now() - dbStart;
    checks.status = "degraded";
  }

  if (typeof redis.ping === "function") {
    try {
      await redis.ping();
      checks.services.redis = "connected";
    } catch {
      checks.services.redis = "disconnected";
      checks.status = "degraded";
    }
  } else {
    checks.services.redis = "unknown";
  }

  const aiUrl = process.env.AI_ASSIST_API_URL;
  if (aiUrl) {
    try {
      const res = await withTimeout(fetch(`${aiUrl}/health`), 2000, "AI-ASSIST timeout");
      checks.services.aiAssist = res.ok ? "connected" : "degraded";
      if (!res.ok && checks.status === "ok") {
        checks.status = "degraded";
      }
    } catch {
      checks.services.aiAssist = "disconnected";
      checks.status = "degraded";
    }
  } else {
    checks.services.aiAssist = "unconfigured";
  }

  try {
    const result = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM "KnowledgeEmbedding"
    `;

    const rawCount = result[0]?.count ?? 0;
    checks.vectorCount = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount);
  } catch (error) {
    console.error("[api][health] failed to read vector health", error);
    if (checks.status === "ok") checks.status = "degraded";
  }

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
