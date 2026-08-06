import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const THRESHOLD = 0.6;

export async function GET() {
  const checks = {
    status: "ok" as string,
    timestamp: new Date().toISOString(),
    database: "unknown" as string,
    version: process.env.npm_package_version || "1.0.0",
    vectorCount: 0,
    threshold: THRESHOLD,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
    checks.status = "degraded";
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
