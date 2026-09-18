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
    version: process.env.npm_package_version || "1.0.0",
    vectorCount: 0,
    threshold: THRESHOLD,
    services: {
      database: "unknown" as "connected" | "disconnected" | "unknown",
      redis: "unknown" as "connected" | "disconnected" | "unknown",
    },
  };

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS, "Database ping timeout");
    checks.services.database = "connected";
  } catch {
    checks.services.database = "disconnected";
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
