import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  let redis: "connected" | "disconnected" = "disconnected";

  try {
    const { redis: redisClient } = await import("@/lib/redis");
    const pong = await redisClient.ping();
    redis = pong === "PONG" ? "connected" : "disconnected";
  } catch (error) {
    console.error("[api][ai][health] redis ping failed", error);
  }

  return NextResponse.json({
    status: redis === "connected" ? "active" : "degraded",
    redis,
    timestamp: Date.now(),
  }, {
    status: redis === "connected" ? 200 : 503,
  });
}
