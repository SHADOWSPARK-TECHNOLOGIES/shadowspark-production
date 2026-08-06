import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { handleCorsPreflight, withCors } from "@/lib/cors";

export const dynamic = 'force-dynamic';

function normalizeStatus(lead: any) {
  if (lead.status === "REJECTED") return "Rejected";
  if (lead.demo?.approved || lead.demoApproved) return "Approved";
  if (lead.demo) return "Demo Generated";
  if (lead.status === "PAID" || lead.paymentRef) return "Paid";
  return "New";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  if (format === 'json') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader === "Bearer undefined" || authHeader === "Bearer null") {
      return NextResponse.json({ error: "Unauthorized mobile request" }, { status: 401 });
    }
    if (authHeader !== `Bearer ${process.env.MOBILE_OPERATOR_KEY}`) {
      return NextResponse.json({ error: "Unauthorized mobile request" }, { status: 401 });
    }

    const leadsData = await prisma.lead.findMany({
      include: { demo: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formattedLeads = leadsData.map((lead: any) => ({
      id: lead.id,
      domain: lead.domain || lead.companyName || "Unknown",
      status: normalizeStatus(lead),
      auditScore: lead.leadScore || 0,
      createdAt: lead.createdAt.toISOString()
    }));

    return withCors(
      NextResponse.json(
      { leads: formattedLeads },
      ),
      request,
      "GET, OPTIONS"
    );
  }

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Basic fallback for non-mobile web if needed
  return NextResponse.json({ error: "Use format=json for mobile operator view" }, { status: 400 });
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, "GET, OPTIONS");
}
