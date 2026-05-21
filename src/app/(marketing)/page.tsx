import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonical("/"),
  title: "Sovereign Financial Node — Institutional Infrastructure for Lagos",
  description:
    "Institutional-grade financial infrastructure for High-Net-Worth liquidity movers in the 2026 Lagos market. Real-time ledger transparency, automated regulatory compliance, and AI-powered treasury operations.",
  openGraph: {
    title: "Shadowspark — Sovereign Financial Node",
    description:
      "Total Visibility. Mathematical Certainty. Sovereign Wealth. Institutional infrastructure for the 2026 Lagos market.",
  },
};

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTIVE TERMINAL — Primary Marketing Interface
 * ═══════════════════════════════════════════════════════════════
 *
 * Aesthetic: OBSIDIAN HUD (Glassmorphism 2.0)
 *   - Obsidian Black (#0a0b0d) base
 *   - Deep Emerald (#10956a) primary
 *   - Sovereign Gold (#c9922a) compliance accents
 *   - Liquid Glass: blur(12px) saturate(160%) Tier I panels
 *   - Golden Curve: cubic-bezier(0.16, 1, 0.3, 1) transitions
 *
 * Sections:
 *   1. Topbar — "The Compliance Anchor" (SEC ARIP + BVN Shield badges)
 *   2. Hero — "Institutional Intent" (Dynamic copy + Ledger display)
 *   3. Executive Shield — Anti-Deepfake Identity (Orbital Scan Ring)
 *   4. Market Pulse — RAG Regulatory Feed (Vertical glass cards)
 *   5. RWA Securitization — Epe/Ikoyi/Patek Philippe token cards
 *   6. Final CTA — "Initialize Onboarding" + Trust signals
 *
 * Zero hydration errors: client sub-components use "use client"
 * while the shell is an async Server Component.
 * ═══════════════════════════════════════════════════════════════
 */

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Shield, FileText } from "lucide-react";
import { Topbar } from "@/components/marketing/Topbar";
import { SovereignLogo } from "@/components/marketing/SovereignLogo";
import { LedgerTransparency } from "@/components/marketing/LedgerTransparency";
import { RWASecuritization } from "@/components/marketing/RWASecuritization";
import { UrgencyHero } from "@/components/landing/UrgencyHero";
import { TrustedByStrip } from "@/components/marketing/TrustedByStrip";

// Below-fold components loaded lazily to reduce initial bundle size.
const ExecutiveShieldSection = dynamic(
  () =>
    import("@/components/marketing/ExecutiveShieldSection").then(
      (m) => m.ExecutiveShieldSection,
    ),
  { loading: () => <div className="h-[600px]" /> },
);

const MarketPulseSection = dynamic(
  () =>
    import("@/components/marketing/MarketPulseSection").then(
      (m) => m.MarketPulseSection,
    ),
  { loading: () => <div className="h-[500px]" /> },
);

const FinalCTASection = dynamic(
  () =>
    import("@/components/marketing/FinalCTASection").then(
      (m) => m.FinalCTASection,
    ),
  { loading: () => <div className="h-[400px]" /> },
);

const TerminalFooter = dynamic(
  () =>
    import("@/components/marketing/TerminalFooter").then(
      (m) => m.TerminalFooter,
    ),
  { loading: () => <div className="h-[200px]" /> },
);

const TestimonialCarousel = dynamic(
  () =>
    import("@/components/marketing/TestimonialCarousel").then(
      (m) => m.TestimonialCarousel,
    ),
  { loading: () => <div className="h-[300px]" /> },
);

const InfraStrip = dynamic(
  () =>
    import("@/components/marketing/InfraStrip").then((m) => m.InfraStrip),
  { loading: () => <div className="h-[100px]" /> },
);

// ── Types ─────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// ── Hero copy variants ────────────────────────────────────────────────────

type HeroCopy = {
  badge: string;
  headline: string;
  subheadline: string;
};

const HERO_COPIES: Record<string, HeroCopy> = {
  default: {
    badge: "SOVEREIGN FINANCIAL NODE — LAGOS MAINNET",
    headline:
      "Total Visibility. Sovereign Wealth. Anti-Fragile Architecture.",
    subheadline:
      "Institutional-grade financial infrastructure for High-Net-Worth liquidity movers in the 2026 Lagos market. Real-time ledger transparency, automated regulatory compliance, and AI-powered treasury operations — hardened for the May 1st BVN-Phone Lock.",
  },
  vasp: {
    badge: "SEC CIRCULAR 26-1 COMPLIANCE ENGINE",
    headline:
      "SEC Circular 26-1 Compliance. Automated. Institutional-Grade.",
    subheadline:
      "VASP capital requirement deadline June 2027. Shadowspark automates your compliance pipeline — capital reserve provisioning, regulatory reporting, and treasury custody — so you meet the ₦2 billion threshold before the regulator's deadline.",
  },
  rwa: {
    badge: "RWA SECURITIZATION ENGINE",
    headline:
      "Fractional Liquidity for Lagos Real Estate. Securitized in Kobo.",
    subheadline:
      "Tokenize high-value Lagos real estate into liquid, tradeable fractions. Each kobo-denominated share is backed by title-deeded assets — Epe, Ikoyi, Banana Island. Smart-contract custody with full on-chain transparency.",
  },
};

// ── Section 1: Topbar ─────────────────────────────────────────────────────
// Injected via Topbar client component (fixed position)

// ── Section 2: Hero — "Institutional Intent" ─────────────────────────────

async function HeroSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const trigger =
    typeof params?.vasp !== "undefined"
      ? "vasp"
      : typeof params?.rwa !== "undefined"
        ? "rwa"
        : typeof params?.intent === "string" && params.intent === "vasp"
          ? "vasp"
          : typeof params?.intent === "string" && params.intent === "rwa"
            ? "rwa"
            : "default";

  const copy = HERO_COPIES[trigger] ?? HERO_COPIES.default;

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

        {/* HUD Status Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 text-[11px] font-mono tracking-[0.22em] text-emerald-400 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {copy.badge}
          <span className="text-zinc-600">v1.0</span>
        </div>

        {/* Headline — using font-display (Cormorant Garamond) */}
        <h1 className="font-display max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl golden-transition">
          {copy.headline}
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl font-sans">
          {copy.subheadline}
        </p>

        {/* Predictive UI — Ledger Liquidity Display */}
        <div className="mt-12 w-full max-w-lg">
          <Suspense
            fallback={
              <div className="h-28 w-full animate-pulse rounded-2xl bg-white/3" />
            }
          >
            <LedgerTransparency />
          </Suspense>
        </div>

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
            <FileText className="h-4 w-4" />
            View Q2 2026 Regulatory Intelligence
          </Link>
        </div>

        {/* BVN Lock Anchor */}
        <div className="mt-10 flex items-center gap-3 rounded-full border border-gold-500/20 bg-gold-500/5 px-5 py-2 text-[10px] font-mono uppercase tracking-wider text-gold-400/80">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500" />
          </span>
          CBN BVN-PHONE LOCK: MAY 1st — IDENTITY ANCHORED & COMPLIANT
        </div>

        {/* Compact trust reinforcement — payment rails microcopy */}
        <p className="mt-8 text-[11px] font-mono tracking-wide text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/60" />
            WhatsApp Business API
          </span>
          <span className="mx-2.5 inline-block text-zinc-700 select-none">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/60" />
            Paystack Payments
          </span>
        </p>
      </div>
    </section>
  );
}

// ── Section 3: Executive Shield (Anti-Deepfake Identity) ─────────────────
// Handled by ExecutiveShieldSection component

// ── Section 4: Market Pulse (RAG Regulatory Feed) ────────────────────────
// Handled by MarketPulseSection component

// ── Section 5: RWA Securitization ────────────────────────────────────────
// Handled by RWASecuritization server component

// ── Section 6: Final CTA — Executive Access ──────────────────────────────
// Handled by FinalCTASection component

// ── Footer ────────────────────────────────────────────────────────────────
// Handled by TerminalFooter component

// ── Main Page ─────────────────────────────────────────────────────────────

export default async function ExecutiveTerminal({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const isUrgencyZone =
    typeof params?.zone === "string" && params.zone === "urgency";

  return (
    <div className="bg-obsidian font-sans text-zinc-400 selection:bg-emerald-500/30">
      {/* Section 1: Fixed Compliance Anchor Topbar */}
      <Topbar />

      {/* Spacer for fixed topbar */}
      <div className="h-14" />

      {/* Section 2: Hero — Institutional Intent / Funnel Blitz Mode */}
      {isUrgencyZone ? (
        <UrgencyHero />
      ) : (
        <HeroSection searchParams={searchParams} />
      )}

      {/* Trusted By Strip — Social proof after hero */}
      <TrustedByStrip />

      {/* Section 3: Executive Shield — Anti-Deepfake Identity */}
      <ExecutiveShieldSection />

      {/* Section 4: Market Pulse — RAG Regulatory Feed */}
      <MarketPulseSection />

      {/* Section 5: RWA Securitization */}
      <RWASecuritization />

      {/* Testimonials Carousel — Social proof before CTA */}
      <TestimonialCarousel />

      {/* Section 6: Final CTA */}
      <FinalCTASection />

      {/* Infrastructure Trust Strip */}
      <InfraStrip />

      {/* Footer */}
      <TerminalFooter />
    </div>
  );
}
