import { NextResponse } from "next/server";
import { GET as healthCheck } from "@/app/api/health/route";

export const runtime = "nodejs";

export async function GET() {
  const healthResponse = await healthCheck();
  const data = await healthResponse.json();
  const isReady = healthResponse.status === 200 && data.status === "ok";

  return NextResponse.json(
    {
      status: isReady ? "ready" : "not_ready",
      ready: isReady,
      checks: data,
    },
    { status: isReady ? 200 : 503 }
  );
}
