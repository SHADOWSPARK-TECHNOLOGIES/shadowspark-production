export const dynamic = "force-dynamic";

import type { Prisma } from "@/generated/prisma/client/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatsRow from "./StatsRow";
import GlassCard from "@/components/ui/GlassCard";
import { BentoGrid, BentoGridItem } from "@/components/ui/templates/BentoGridPro";
import OperatorLeadTable, { type OperatorLead } from "./OperatorLeadTable";
import LiveTelemetryPanel from "./LiveTelemetryPanel";

type LeadWithDemo = Prisma.LeadGetPayload<{ include: { demo: true } }>;
type DemoWithLead = Prisma.DemoGetPayload<{ include: { lead: true } }>;

function normalizeStatus(lead: {
  status: string;
  paymentRef: string | null;
  demoApproved: boolean;
  demo: { approved: boolean; slug: string } | null;
}) {
  if (lead.status === "REJECTED") return "Rejected" as const;
  if (lead.demo?.approved || lead.demoApproved) return "Approved" as const;
  if (lead.demo) return "Demo Generated" as const;
  if (lead.status === "PAID" || lead.paymentRef) return "Paid" as const;
  return "New" as const;
}

export default async function OperatorDashboard() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const [leads, recentDemos, systemErrors] = await Promise.all([
    prisma.lead.findMany({
      include: { demo: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.demo.findMany({
      include: { lead: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.systemEvent.findMany({
      where: { type: "error" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []), // Fallback to empty array if SystemEvent model is not yet accessible
  ]);

  const tableData: OperatorLead[] = leads.map((lead: LeadWithDemo) => {
    const audit = (lead.miniAuditData ?? {}) as Record<string, unknown>;
    const name =
      typeof audit.companyName === "string" && audit.companyName
        ? audit.companyName
        : lead.phoneNumber || 'Unknown';
    const business =
      typeof audit.businessType === "string" && audit.businessType
        ? audit.businessType
        : lead.intent ?? "Uncategorized";
    
    // Extract rootUrl from demo config or miniAuditData
    let rootUrl = undefined;
    if (lead.demo?.config && typeof lead.demo.config === 'object') {
      const config = lead.demo.config as Record<string, unknown>;
      if (typeof config.rootUrl === 'string') rootUrl = config.rootUrl;
    }
    if (!rootUrl && typeof audit.website === 'string') rootUrl = audit.website;
    if (!rootUrl && typeof audit.url === 'string') rootUrl = audit.url;

    return {
      id: lead.id,
      name,
      business,
      status: normalizeStatus(lead),
      demoSlug: lead.demo?.slug ?? null,
      leadScore: lead.leadScore,
      reasoning: (audit.reasoning as string) || null,
      rootUrl,
    };
  });


  const recentActivity = recentDemos.map((demo: DemoWithLead) => ({
    id: demo.id,
    label: `${demo.approved ? "Approved" : "Pending"} demo for ${demo.lead.phoneNumber}`,
    timestamp: demo.updatedAt.toLocaleString(),
  }));

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30">
      <nav className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500 flex items-center justify-center">
              <span className="text-black font-black text-xl">S</span>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">Operator Command Center</p>
              <h1 className="text-xl font-bold tracking-tighter uppercase">ShadowSpark Control Plane</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-2 text-xs font-mono uppercase tracking-[0.16em] text-green-300 md:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              System Health
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Live Site</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6 lg:p-10">
        <StatsRow />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="space-y-8">
            <BentoGrid className="md:auto-rows-auto grid-cols-1">
              <BentoGridItem 
                title="Pipeline Command Grid"
                description="Manage all incoming leads and system deployments."
                className="md:col-span-1 p-6"
                header={
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300 mb-6">Lead Operations</p>
                    <OperatorLeadTable data={tableData} />
                  </div>
                }
              />
            </BentoGrid>
          </div>

          <div className="space-y-8">
            <LiveTelemetryPanel />

            <GlassCard className="p-6 border-zinc-800 bg-zinc-950/80 max-h-[400px] overflow-y-auto overflow-x-hidden relative">
              <div className="sticky top-0 bg-zinc-950/90 pb-4 z-10 flex items-center justify-between gap-4 border-b border-zinc-800/50 mb-4 backdrop-blur-md">
                <p className="text-xs font-mono uppercase tracking-[0.22em] text-rose-400">System Telemetry (Digests)</p>
                <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-rose-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                  Tripwires
                </span>
              </div>
              <div className="space-y-4">
                {systemErrors.length ? systemErrors.map((err: any) => (
                  <div key={err.id} className="group relative rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-4 transition-colors hover:border-rose-500/40">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-transparent rounded-l-2xl opacity-50 group-hover:opacity-100" />
                    <p className="font-mono text-xs text-rose-300 break-all">{err.digest || "ERR_UNKNOWN_DIGEST"}</p>
                    <p className="mt-2 text-sm text-zinc-300 line-clamp-2">{err.message}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{err.createdAt.toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="text-sm text-zinc-500 text-center py-10">No recent tripwires.</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-zinc-800 bg-zinc-950/80">
              <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">Quick Actions</p>
              <div className="mt-5 space-y-3">
                <Link href="/" className="block rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  View Demo Surface
                </Link>
                <Link href="/operator" className="block rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  Review Pending Leads
                </Link>
                <Link href="/dashboard" className="block rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  Open Main Dashboard
                </Link>
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-zinc-800 bg-zinc-950/80 max-h-[300px] overflow-y-auto overflow-x-hidden relative">
              <div className="sticky top-0 bg-zinc-950/90 pb-4 z-10 flex items-center justify-between gap-4 border-b border-zinc-800/50 mb-4 backdrop-blur-md">
                <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">Live Activity Feed</p>
                <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-green-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  Real-time
                </span>
              </div>
              <div className="space-y-4">
                {recentActivity.length ? recentActivity.map((item: { id: string; label: string; timestamp: string }, i: number) => (
                  <div key={item.id} className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-cyan-500/30">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-transparent rounded-l-2xl opacity-0 transition-opacity group-hover:opacity-100" />
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-500">{item.timestamp}</p>
                  </div>
                )) : (
                  <p className="text-sm text-zinc-500 text-center py-10">Listening for signals...</p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}

