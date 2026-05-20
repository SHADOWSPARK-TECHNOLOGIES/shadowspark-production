/**
 * UrgencyHero — Ikoyi HNWI Deal-Closing Hero
 *
 * Obsidian HUD Edition.
 * A full-viewport hero section targeting Ikoyi HNWIs with ₦2B+ deal capacity.
 * Features:
 *   - "Certified for ₦2B Deals. BVN-Locked May 1st." headline
 *   - SEC 26-1 + BVN compliance badges (reuses ComplianceBadge)
 *   - CTA cluster with "Initialize Onboarding" + "View Compliance Terminal"
 *   - Vortex background glow, glassmorphism panels
 *
 * Designed to slot into the marketing page between Hero and Executive Shield,
 * or as a standalone landing page hero for paid campaigns.
 */

import Link from "next/link";
import { ArrowRight, Shield, BookOpen } from "lucide-react";
import { ComplianceBadge } from "@/components/marketing/ComplianceBadge";
import { SovereignLogo } from "@/components/marketing/SovereignLogo";

export function UrgencyHero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28">
      {/* Vortex background glow — emerald/gold */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[200px]" />
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-gold-500/3 blur-[160px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-emerald-500/3 blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        {/* Sovereign Node Logo */}
        <div className="mb-8 golden-transition">
          <SovereignLogo size={64} animated variant="emerald" />
        </div>

        {/* Compliance Badge Cluster — SEC 26-1 + BVN */}
        <div className="mb-8">
          <ComplianceBadge variant="full" showCountdown />
        </div>

        {/* HUD Status Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 text-[11px] font-mono tracking-[0.22em] text-emerald-400 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          SOVEREIGN FINANCIAL NODE — LAGOS MAINNET
          <span className="text-zinc-600">v1.0</span>
        </div>

        {/* Headline — font-display (Cormorant Garamond) */}
        <h1 className="font-display max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl golden-transition">
          Certified for{" "}
          <span className="text-gold-400">₦2B Deals</span>.
          <br />
          BVN-Locked{" "}
          <span className="text-emerald-400">May 1st</span>.
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl font-sans">
          Institutional-grade financial infrastructure for Ikoyi HNWI liquidity
          movers. SEC Circular 26-1 capital adequacy, double-entry ledger
          transparency, and automated regulatory compliance — hardened for the
          CBN BVN-Phone Lock deadline.
        </p>

        {/* CTA Cluster */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/checkout/new"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-8 py-4 text-sm font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md golden-transition duration-300 hover:bg-emerald-500/20 hover:shadow-[0_0_40px_rgba(16,149,106,0.15)]"
          >
            {/* HUD scanline */}
            <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,149,106,0.08),transparent)] translate-x-[-100%] golden-transition duration-700 group-hover:translate-x-[100%]" />
            <Shield className="h-4 w-4" />
            Initialize Onboarding
            <ArrowRight className="h-4 w-4 golden-transition duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/admin/health"
            className="inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/3 px-8 py-4 text-sm font-medium text-zinc-300 backdrop-blur-md golden-transition duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <BookOpen className="h-4 w-4" />
            View Compliance Terminal
          </Link>
        </div>

        {/* Compliance detail strip */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-gold-500" />
            SEC Circular 26-1 Capital Adequacy
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
            Double-Entry Ledger (∑D − ∑C = ₦0.00)
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

export default UrgencyHero;
