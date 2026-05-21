import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLeadToSyncQueue } from "@/lib/leads/queue";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Create or Update lead initially to get ID and ensure email is saved
    const lead = await prisma.lead.upsert({
      where: { phoneNumber: data.phone },
      update: {
        
        miniAuditData: {
          ...data,
          source: "Web Qualification Form"
        },
        status: "QUALIFIED"
      },
      create: {
        phoneNumber: data.phone,
        
        status: "QUALIFIED",
        intent: "WEB_FORM",
        miniAuditData: {
          ...data,
          source: "Web Qualification Form"
        }
      }
    });

    // Offload enrichment and nurture trigger to background queue
    await addLeadToSyncQueue({
      ...data,
      leadId: lead.id,
      source: "Web Qualification Form"
    });

    return NextResponse.json({ 
      success: true, 
      leadId: lead.id,
      message: "Qualification received and queued" 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Qualification API error:", error);
    return NextResponse.json({ error: "Failed to process qualification" }, { status: 500 });
  }
}
