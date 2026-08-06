import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sniperQueue } from "@/lib/sniper/queue";

export const dynamic = 'force-dynamic';

const UniversalTargetSchema = z.object({
  source: z.enum(['apollo', 'builtwith', 'linkedin', 'local', 'manual']),
  domain: z.string().url(),
  companyName: z.string().min(2),
  decisionMaker: z.object({
    firstName: z.string().optional(),
    email: z.string().email().optional(),
    linkedinUrl: z.string().url().optional(),
  }).optional(),
  signal: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INGEST_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized ingestion request" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate against the Universal Schema
    const target = UniversalTargetSchema.parse(body);

    // Save to Prisma database
    const sniperTarget = await prisma.sniperTarget.create({
      data: {
        source: target.source,
        domain: target.domain,
        companyName: target.companyName,
        firstName: target.decisionMaker?.firstName,
        email: target.decisionMaker?.email,
        linkedinUrl: target.decisionMaker?.linkedinUrl,
        signal: target.signal,
        status: "new",
      }
    });
    
    // Dispatch to Cloud Tasks (via BullMQ) for Firecrawl/Gemini analysis
    await sniperQueue.add("process-target", {
      targetId: sniperTarget.id,
      domain: target.domain,
    });
    
    console.log(`[SNIPER INGEST] Target Locked & Queued: ${target.domain} (DB ID: ${sniperTarget.id})`);

    return NextResponse.json({ 
      status: 'ingested', 
      id: sniperTarget.id,
      domain: target.domain,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid target payload", details: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error("[SNIPER INGEST ERROR]", error);
    return NextResponse.json({ error: "Internal server error during ingestion" }, { status: 500 });
  }
}
