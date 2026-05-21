import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const [lead, systemEvents, emailEvents] = await prisma.$transaction([
      prisma.lead.findUnique({
        where: { id: leadId },
      }),
      prisma.systemEvent.findMany({
        where: {
          metadata: {
            path: ["leadId"],
            equals: leadId,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailEvent.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const payload = JSON.stringify(
      { lead, systemEvents, emailEvents },
      null,
      2
    );

    return new Response(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lead-${leadId}.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
