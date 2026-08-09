import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const services: { database: string; redis: string } = {
    database: "disconnected",
    redis: "disconnected",
  };
  let status = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = "connected";
  } catch {
    services.database = "disconnected";
    status = "degraded";
  }

  try {
    await redis.ping();
    services.redis = "connected";
  } catch {
    services.redis = "disconnected";
    status = "degraded";
  }

  const statusCode = status === "ok" ? 200 : 503;
  return NextResponse.json(
    { status, services, timestamp: new Date().toISOString() },
    { status: statusCode },
  );
}
