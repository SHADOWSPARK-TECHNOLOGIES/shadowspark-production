/**
 * FinalCTASection — Executive Access / Initialize Onboarding
 *
 * Obsidian HUD Edition.
 * Renders the final call-to-action section with onboarding CTA,
 * compliance badge trust reinforcement, and security trust signals.
 */

import Link from "next/link";
import { ArrowRight, Shield, FileText } from "lucide-react";
import { ComplianceBadge } from "@/components/marketing/ComplianceBadge";

export function FinalCTASection() {
  return (
    <section className="relative border-t border-white/5 py-24">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,149,106,0.03),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* HUD Section Header */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Executive Access
        </div>

        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl golden-transition">
          Deploy Your Sovereign Financial Node
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 font-sans">
          Initialize your institutional onboarding to access the full Shadowspark
          treasury suite — real-time ledger, automated regulatory compliance,
          AI-powered liquidity management, and RWA securitization for the Lagos
          market. Hardened for the May 1st BVN-Phone Lock.
        </p>

        {/* CTA cluster */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/checkout/new"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-10 py-5 text-sm font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md golden-transition duration-300 hover:bg-emerald-500/20 hover:shadow-[0_0_60px_rgba(16,149,106,0.2)]"
          >
            <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,149,106,0.1),transparent)] translate-x-[-100%] golden-transition duration-700 group-hover:translate-x-[100%]" />
            <Shield className="h-5 w-5" />
            Initialize Onboarding
            <ArrowRight className="h-5 w-5 golden-transition duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/admin/health"
            className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/3 px-10 py-5 text-sm font-medium text-zinc-300 backdrop-blur-md golden-transition duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <FileText className="h-5 w-5" />
            View Q2 2026 Regulatory Intelligence
          </Link>
        </div>

        {/* Compliance badge — trust reinforcement near checkout zone */}
        <div className="mt-12 flex justify-center">
          <ComplianceBadge variant="compact" showCountdown />
        </div>

        {/* Trust signals */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            TLS 1.3 in Transit
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            AES-256 Encryption at Rest
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            NDPR-Compliant Data Handling
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            Double-Entry Ledger
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            BVN-Phone Lock Ready
          </span>
        </div>
      </div>
    </section>
  );
}

export default FinalCTASection;
