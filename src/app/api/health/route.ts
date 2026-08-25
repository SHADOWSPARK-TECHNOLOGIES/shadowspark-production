import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
const THRESHOLD = 0.6;

export async function GET() {
  const checks = {
    status: "ok" as "ok" | "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    vectorCount: 0,
    threshold: THRESHOLD,
    services: {
      database: "unknown" as "connected" | "disconnected" | "unknown",
      redis: "unknown" as "connected" | "disconnected" | "not_configured" | "unknown",
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = "connected";
  } catch {
    checks.services.database = "disconnected";
    checks.status = "degraded";
  }

  if (!process.env.REDIS_URL?.trim()) {
    checks.services.redis = "not_configured";
  } else {
    try {
      await redis.ping();
      checks.services.redis = "connected";
    } catch {
      checks.services.redis = "disconnected";
      checks.status = "degraded";
    }
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
