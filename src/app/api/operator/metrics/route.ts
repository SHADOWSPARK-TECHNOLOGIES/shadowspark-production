import type { Prisma } from "@/generated/prisma/client/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

type LeadWithDemoAndPayments = Prisma.LeadGetPayload<{ include: { demo: true; payments: true } }>;
type DemoWithLead = Prisma.DemoGetPayload<{ include: { lead: true } }>;

function normalizeStatus(lead: {
  status: string;
  paymentRef: string | null;
  demoApproved: boolean;
  demo: { approved: boolean } | null;
}) {
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
    if (authHeader !== `Bearer ${process.env.MOBILE_OPERATOR_KEY}`) {
      return NextResponse.json({ error: "Unauthorized mobile request" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      include: { demo: true, payments: true },
      orderBy: { updatedAt: "desc" },
    });

    const totalLeads = leads.length;
    const approvedCount = leads.filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) === "Approved").length;
    const conversionRate = totalLeads === 0 ? "0.0" : ((approvedCount / totalLeads) * 100).toFixed(1);
    const activeDemos = leads.filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) === "Demo Generated").length;
    const revenueLeakage = leads
        .filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) === "Rejected")
        .reduce((sum: number, lead: LeadWithDemoAndPayments) => sum + (lead.leadScore && lead.leadScore >= 70 ? 750 : 300), 0)
        .toString();

    return NextResponse.json(
      { metrics: { totalLeads, conversionRate, revenueLeakage, activeDemos } },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leads, demos] = await Promise.all([
    prisma.lead.findMany({
      include: { demo: true, payments: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.demo.findMany({
      include: { lead: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const totalLeads = leads.length;
  const approvedCount = leads.filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) === "Approved").length;
  const conversionRate = totalLeads === 0 ? 0 : Number(((approvedCount / totalLeads) * 100).toFixed(1));
  const pendingDemos = leads.filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) === "Demo Generated").length;
  const pipelineValueUsd = leads
    .filter((lead: LeadWithDemoAndPayments) => normalizeStatus(lead) !== "Rejected")
    .reduce((sum: number, lead: LeadWithDemoAndPayments) => sum + (lead.leadScore && lead.leadScore >= 70 ? 750 : 300), 0);

  const activity = [
    ...leads.slice(0, 5).map((lead: LeadWithDemoAndPayments) => ({
      id: `lead-${lead.id}`,
      label: `${normalizeStatus(lead)} · ${lead.phoneNumber}`,
      timestamp: lead.updatedAt.toISOString(),
    })),
    ...demos.map((demo: DemoWithLead) => ({
      id: `demo-${demo.id}`,
      label: `${demo.approved ? "Demo approved" : "Demo pending"} · ${demo.slug}`,
      timestamp: demo.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const sparkline = leads.slice(0, 7).map((lead) => lead.leadScore ?? 25);

  return NextResponse.json({
    totalLeads,
    pendingDemos,
    conversionRate,
    pipelineValueUsd,
    activity,
    sparkline,
  });
}
