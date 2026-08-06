import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  // Simulate AI health check (active/thinking states)
  // In a full implementation, this pings Vertex AI or Gemini API
  const statuses = ["active", "thinking", "active"];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  return NextResponse.json({
    status,
    timestamp: Date.now(),
  });
}
