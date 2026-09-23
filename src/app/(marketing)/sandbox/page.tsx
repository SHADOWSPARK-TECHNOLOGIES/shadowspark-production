"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { provisionTrialTenant } from "@/app/actions/sandbox";

interface TargetInstitution {
  slug: string;
  name: string;
  sector: string;
  regime: string;
  description: string;
  highlight: string;
}

const BATCH_01_INSTITUTIONS: TargetInstitution[] = [
  {
    slug: "fairmoney",
    name: "FairMoney Microfinance Bank",
    sector: "Digital MFB / Lending",
    regime: "CBN Tier-1 MFB / NDIC",
    description: "Credit-led digital banking platform with over 10,000 daily microloan underwriting decisions.",
    highlight: "High-frequency loan exception triage",
  },
  {
    slug: "carbon",
    name: "Carbon Finance (OneFi)",
    sector: "Digital Lending & Payments",
    regime: "CBN Licensed Finance House",
    description: "Pioneer consumer credit, SME cashflow advances, and BNPL digital payment rails in Nigeria.",
    highlight: "Consumer credit AML & velocity scoring",
  },
  {
    slug: "renmoney",
    name: "Renmoney Microfinance Bank",
    sector: "Consumer & MSME Lending",
    regime: "CBN Licensed MFB / NDIC",
    description: "Leading consumer fintech MFB providing business working capital and personal installment loans.",
    highlight: "MSME financial statement verification",
  },
  {
    slug: "branch",
    name: "Branch International Nigeria",
    sector: "Personal Lending & Neo-bank",
    regime: "CBN MFB / Consumer Protection",
    description: "Machine-learning driven personal finance platform providing algorithmic loan origination.",
    highlight: "Algorithmic decision fairness review",
  },
  {
    slug: "kuda",
    name: "Kuda Microfinance Bank",
    sector: "Digital Banking",
    regime: "CBN National MFB / NDIC",
    description: "Zero-fee digital challenger bank servicing over 7 million retail and merchant accounts.",
    highlight: "KYC tier upgrade exception monitoring",
  },
  {
    slug: "palmpay",
    name: "PalmPay Nigeria",
    sector: "Mobile Payments & Consumer Credit",
    regime: "CBN Licensed MMO / NDIC",
    description: "Nationwide agent network and mobile wallet powering millions of daily consumer transactions.",
    highlight: "Agent liquidity & structuring alerts",
  },
  {
    slug: "quidax",
    name: "Quidax Technologies",
    sector: "Digital Assets / SEC ARIP",
    regime: "SEC ARIP Accelerated Approval",
    description: "SEC ARIP-approved digital asset exchange providing fiat-crypto order book matching and custody.",
    highlight: "Travel rule & AML on/off-ramp checks",
  },
  {
    slug: "busha",
    name: "Busha Digital",
    sector: "Crypto & Exchange / SEC ARIP",
    regime: "SEC ARIP Digital Asset Operator",
    description: "SEC-regulated cryptocurrency exchange and yield platform for retail and institutional traders.",
    highlight: "Cross-border asset flow monitoring",
  },
  {
    slug: "yellowcard",
    name: "Yellow Card Financial",
    sector: "Pan-African On/Off Ramp",
    regime: "Licensed Stablecoin Gateway",
    description: "Pan-African payment rails and stablecoin liquidity provider operating across 20+ countries.",
    highlight: "FX spread & liquidity reserve checks",
  },
  {
    slug: "flitaa",
    name: "Flitaa Marketplace",
    sector: "Crypto & Payment Infrastructure",
    regime: "Digital Asset Settlement Rail",
    description: "Simplified cryptocurrency retail gateway and institutional liquidity settlement engine.",
    highlight: "Real-time wallet risk classification",
  },
];

const SYNTHETIC_EXCEPTIONS = [
  {
    id: "ex_bvn_mismatch",
    title: "BVN Identity Mismatch & Name Transposition",
    applicant: "Adaeze Okonkwo",
    phone: "+234 801 122 3344",
    amount: "₦350,000.00",
    purpose: "Working Capital — MSME Retail",
    status: "UNDER_REVIEW",
    riskCategory: "Identity Governance (CBN Circular 2026/04)",
    flag: "Applicant submitted legal name differs by 2 characters from NIBSS BVN database master record.",
  },
  {
    id: "ex_structuring_velocity",
    title: "Structuring & Velocity Threshold Breach",
    applicant: "Emeka Nwosu",
    phone: "+234 802 233 4455",
    amount: "₦1,250,000.00",
    purpose: "Inventory Financing",
    status: "KYC_PENDING",
    riskCategory: "AML Velocity (NFIU SAR Guidelines)",
    flag: "Three consecutive tranches requested within 48 hours to evade single-disbursement scrutiny limit.",
  },
  {
    id: "ex_pep_flag",
    title: "PEP Directorship Screening & Adverse Media",
    applicant: "Babajide Alabi",
    phone: "+234 803 344 5566",
    amount: "₦850,000.00",
    purpose: "Equipment Acquisition",
    status: "UNDER_REVIEW",
    riskCategory: "PEP Screening (SEC ARIP Rule 14.2)",
    flag: "Beneficial owner identified as close associate of designated politically exposed person (PEP).",
  },
];

type ProvisioningStage = "idle" | "partition" | "seeding" | "synthesis" | "session" | "done" | "error";

export default function SandboxPage() {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string>("fairmoney");
  const [customCompany, setCustomCompany] = useState<string>("");
  const [stage, setStage] = useState<ProvisioningStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provisionedDetails, setProvisionedDetails] = useState<any>(null);

  const selectedInstitution =
    BATCH_01_INSTITUTIONS.find((i) => i.slug === selectedSlug) || BATCH_01_INSTITUTIONS[0];

  const handleLaunchTrial = async () => {
    setErrorMessage(null);
    setStage("partition");

    try {
      // Advance telemetry through visible stages for operator confidence
      const stepTimer1 = setTimeout(() => setStage("seeding"), 400);
      const stepTimer2 = setTimeout(() => setStage("synthesis"), 900);
      const stepTimer3 = setTimeout(() => setStage("session"), 1400);

      const result = await provisionTrialTenant({
        institutionSlug: selectedSlug,
        companyName: customCompany.trim() || selectedInstitution.name,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!result.success) {
        setStage("error");
        setErrorMessage("Trial tenant provisioning could not be completed. Please try again.");
        return;
      }

      setProvisionedDetails(result);
      setStage("done");

      // Smooth transition to review queue with guided walk-through state
      setTimeout(() => {
        router.push("/dashboard/reviews?demo=true&guide=1");
      }, 1200);
    } catch (err: unknown) {
      setStage("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred while launching sandbox."
      );
    }
  };

  return (
    <main className="min-h-screen bg-obsidian font-sans text-zinc-400 selection:bg-emerald-500/30">
      {/* Top Header / Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800 px-6 pb-14 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[180px]" />
          <div className="absolute right-10 top-10 h-[350px] w-[350px] rounded-full bg-cyan-500/5 blur-[160px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-[11px] font-mono tracking-[0.2em] text-emerald-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            SEC CIRCULAR 26-1 COMPLIANT SANDBOX
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Instant Trial Tenant &amp; AI-ASSIST Sandbox
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Provision a cryptographically isolated Neon PostgreSQL tenant partition, explore pre-seeded
            synthetic Nigerian loan exceptions with exact Prisma Decimal precision, and experience the Exception
            Review Co-Pilot with live AI advisory briefs in under 3 minutes.
          </p>

          {/* Benchmark Badges */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-zinc-300 font-medium">&lt; 15s Provisioning</span>
              <span className="text-zinc-500">· Atomic Neon Partition</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              <span className="text-zinc-300 font-medium">Strict Multi-Tenant Isolation</span>
              <span className="text-zinc-500">· Row-Level Boundary</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2">
              <Scale className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-300 font-medium">&lt; 3 Min TTFE</span>
              <span className="text-zinc-500">· Time-to-First-Reviewed-Exception</span>
            </div>
          </div>
        </div>
      </section>

      {/* Guided Co-Pilot Walkthrough Banner */}
      <section className="border-b border-zinc-800/80 bg-emerald-950/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              i
            </div>
            <div>
              <span className="font-semibold text-emerald-300">Guided 3-Minute Pilot Workflow:</span>
              <span className="text-zinc-300 ml-1">
                1. Launch isolated partition &rarr; 2. Inspect AI advisory briefs &amp; policy citations &rarr; 3. Submit
                signed compliance annotation with immutable audit log.
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/reviews"
            className="inline-flex shrink-0 items-center gap-1.5 font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Skip to Live Reviews <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Main Interactive Controls */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* Step 1: Target Institution Quick-Select */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  Select Target Nigerian Institution Preset
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pre-configured compliance environments tailored to the top 10 Nigerian digital banking and SEC ARIP
                  institutions.
                </p>
              </div>
              <span className="hidden sm:inline-block rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
                10 TARGET PRESETS
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {BATCH_01_INSTITUTIONS.map((item) => {
                const isSelected = selectedSlug === item.slug;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setSelectedSlug(item.slug)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,149,106,0.15)] ring-1 ring-emerald-500/50"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isSelected ? "text-emerald-400" : "text-zinc-300"
                        }`}
                      >
                        {item.slug}
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <span className="text-sm font-semibold text-zinc-100 mt-1 line-clamp-1">{item.name}</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5">{item.sector}</span>
                    <span className="text-[10px] font-mono text-emerald-400/80 mt-2 bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800 w-fit">
                      {item.regime}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Institution Override */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-zinc-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Custom Institution Name (Optional)</div>
                  <div className="text-[11px] text-zinc-500">
                    Override company name while maintaining {selectedInstitution.name}&apos;s compliance profile
                  </div>
                </div>
              </div>
              <input
                type="text"
                placeholder={selectedInstitution.name}
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
              />
            </div>
          </div>

          {/* Step 2: Synthetic Loan Exception Dataset Preview */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                Pre-Seeded Synthetic Exception Portfolio
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every sandbox partition is pre-populated with 3 realistic Nigerian fintech loan exceptions using exact
                Prisma Decimal precision (no JavaScript float rounding).
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {SYNTHETIC_EXCEPTIONS.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-[11px] font-mono text-zinc-500">CASE #{idx + 1}</span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-300">
                      {ex.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-mono text-cyan-400">{ex.riskCategory}</div>
                    <div className="text-sm font-semibold text-white mt-1">{ex.title}</div>
                  </div>

                  <div className="rounded-lg bg-zinc-950/80 p-2.5 space-y-1.5 border border-zinc-800/60 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Applicant:</span>
                      <span className="text-zinc-200 font-medium">{ex.applicant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Exposure:</span>
                      <span className="text-emerald-400 font-mono font-semibold">{ex.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Purpose:</span>
                      <span className="text-zinc-300">{ex.purpose}</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-400 border-t border-zinc-800/60 pt-2">
                    {ex.flag}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Launch Trial Partition & Progress Telemetry */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-zinc-950 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  Launch Sovereign Compliance Sandbox
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tenant: <code className="text-emerald-300 font-mono">trial-{selectedSlug}-*</code> · Role:{" "}
                  <span className="text-zinc-200 font-semibold">COMPLIANCE</span> · Upstream AI-ASSIST v1.1.0 Ready
                </p>
              </div>

              <button
                type="button"
                disabled={stage !== "idle" && stage !== "error"}
                onClick={handleLaunchTrial}
                className={`inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                  stage === "idle" || stage === "error"
                    ? "border border-emerald-400/50 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,149,106,0.3)]"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {stage === "idle" && (
                  <>
                    Launch Sandbox in 1-Click <ArrowRight className="h-4 w-4" />
                  </>
                )}
                {stage === "error" && (
                  <>
                    <RefreshCw className="h-4 w-4" /> Retry Sandbox Launch
                  </>
                )}
                {stage !== "idle" && stage !== "error" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> Provisioning Partition...
                  </>
                )}
              </button>
            </div>

            {/* Live Telemetry Stepper */}
            {stage !== "idle" && stage !== "error" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
                  <span>PROVISIONING TELEMETRY (LIVE NEON + AI-ASSIST ENGINE)</span>
                  <span className="font-mono text-emerald-400 text-[11px] animate-pulse">PROCESSING</span>
                </div>

                <div className="grid gap-2 sm:grid-cols-4 text-xs">
                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      stage === "partition"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    }`}
                  >
                    {stage === "partition" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                    <span>1. Neon Partition</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      stage === "seeding"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    }`}
                  >
                    {stage === "seeding" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Scale className="h-3.5 w-3.5" />
                    )}
                    <span>2. Seed 3 Exceptions</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      stage === "synthesis"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    }`}
                  >
                    {stage === "synthesis" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5" />
                    )}
                    <span>3. Synthesize Briefs</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      stage === "session" || stage === "done"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    }`}
                  >
                    {stage === "session" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span>4. Enter Co-Pilot</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {stage === "error" && errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-200">Provisioning Notice</div>
                  <p className="mt-0.5 text-zinc-400">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Provisioned Success Banner */}
            {stage === "done" && provisionedDetails && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-emerald-200">Trial Partition Activated:</span>{" "}
                    {provisionedDetails.tenant.name} · Role: {provisionedDetails.membership.role} · Redirecting to
                    review queue...
                  </div>
                </div>
                <Link
                  href="/dashboard/reviews"
                  className="rounded bg-emerald-500 px-3 py-1 font-bold text-zinc-950 hover:bg-emerald-400 transition-colors"
                >
                  Enter Now &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
