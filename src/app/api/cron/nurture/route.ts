import { NextResponse } from "next/server";
import { processNurtureQueue } from "@/lib/leads/nurture";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  
  if (!secret || authHeader !== ("Bearer " + secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("[CRON] Processing Nurture Queue...");
    await processNurtureQueue();
    return NextResponse.json({ success: true, message: "Nurture queue processed" });
  } catch (error) {
    console.error("Nurture CRON error:", error);
    return NextResponse.json({ error: "Failed to process nurture queue" }, { status: 500 });
  }
}
