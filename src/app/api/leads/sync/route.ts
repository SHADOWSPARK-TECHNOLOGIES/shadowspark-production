import { NextResponse } from "next/server";
import { addLeadToSyncQueue } from "@/lib/leads/queue";

export async function POST(req: Request) {
  const secret = req.headers.get("x-sync-secret");

  if (secret !== process.env.LEAD_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    if (!data.phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // SES: Offload to background queue for sub-500ms response
    await addLeadToSyncQueue(data);

    return NextResponse.json({ 
      success: true, 
      message: "Lead received and queued for synchronization" 
    }, { status: 202 });
    
  } catch (error) {
    console.error("Lead sync error:", error);
    return NextResponse.json({ error: "Failed to queue lead" }, { status: 500 });
  }
}
