import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonical("/about"),
  title: "About",
  description:
    "ShadowSpark provides AI-native compliance infrastructure for Nigerian financial institutions — rPPG liveness, automated regulatory monitoring, and real-time pulse detection.",
};

import Link from "next/link";
import { ArrowLeft, Target, BookOpen, Zap, Shield, Globe, Cpu, MapPin } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type ValueProp = {
  icon: typeof Zap;
  title: string;
  description: string;
};

type Leader = {
  name: string;
  role: string;
  bio: string;
};

// ── Data ──────────────────────────────────────────────────────────────────

const valueProps: ValueProp[] = [
  {
    icon: Cpu,
    title: "AI-Native Compliance",
    description:
      "rPPG liveness, automated regulatory monitoring, real-time pulse detection",
  },
  {
    icon: Shield,
    title: "Built for Nigeria",
    description:
      "Deep integration with SEC, CBN, FIRS frameworks. Understanding of local business context.",
  },
  {
    icon: Zap,
    title: "End-to-End Automation",
    description:
      "From lead qualification to compliance verification to payment collection, all in one platform.",
  },
];

const leadership: Leader[] = [
  {
    name: "Stephen",
    role: "Architect",
    bio: "Architect of the ShadowSpark platform. Deep expertise in distributed systems, AI/ML, and Nigerian regulatory technology.",
  },
  {
    name: "Chidi Okonkwo",
    role: "Chief Compliance Officer",
    bio: "Former SEC Nigeria senior examiner with 15+ years in financial regulation. Leads our regulatory framework integration across SEC, CBN, and FIRS mandates.",
  },
  {
    name: "Amara Eze",
    role: "Head of Engineering",
    bio: "Distributed systems engineer who built payment infrastructure processing over ₦50 billion in transaction volume across African fintech platforms.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="bg-obsidian min-h-screen font-sans text-zinc-400 selection:bg-emerald-500/30">
      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-zinc-800 px-6 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[200px]" />
          <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-gold-500/3 blur-[160px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 text-[11px] font-mono tracking-[0.22em] text-emerald-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            ABOUT
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            About ShadowSpark
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Building the sovereign compliance infrastructure for Nigeria's
            financial future
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Last updated: April 2026
          </p>
        </div>
      </section>

      {/* ── Content ────────────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <article className="space-y-12">
            {/* ── Our Mission ──────────────────────────────────────── */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <Target className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Our Mission
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    To democratize regulatory compliance for African businesses
                    through AI-powered automation, making world-class compliance
                    infrastructure accessible to every fintech, bank, and
                    enterprise on the continent.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Our Story ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Our Story
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    Founded in Port Harcourt, Nigeria. Born from the reality
                    that African businesses deserve infrastructure built for
                    African regulations — not adapted from foreign systems.
                    ShadowSpark combines deep expertise in Nigerian regulatory
                    frameworks (SEC, CBN, FIRS) with cutting-edge AI to automate
                    what was previously manual, expensive, and error-prone.
                  </p>
                </div>
              </div>
            </section>

            {/* ── What Sets Us Apart ───────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-8">
                What Sets Us Apart
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                {valueProps.map((prop) => {
                  const Icon = prop.icon;
                  return (
                    <div
                      key={prop.title}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 mb-4">
                        <Icon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-semibold text-zinc-100 mb-2">
                        {prop.title}
                      </h3>
                      <p className="text-sm leading-6 text-zinc-400">
                        {prop.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Leadership ───────────────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-8">
                Leadership
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                {leadership.map((leader) => (
                  <div
                    key={leader.name}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 mb-4">
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {leader.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-100">
                      {leader.name}
                    </h3>
                    <p className="text-xs font-mono tracking-wider text-emerald-400/80 uppercase mt-1 mb-3">
                      {leader.role}
                    </p>
                    <p className="text-sm leading-6 text-zinc-400">
                      {leader.bio}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Our Presence ─────────────────────────────────────── */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Our Presence
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    Based in Port Harcourt, serving clients across Lagos,
                    Abuja, and emerging tech hubs nationwide.
                  </p>
                </div>
              </div>
            </section>
          </article>

          {/* ── Bottom CTA ─────────────────────────────────────────── */}
          <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Ready to transform your compliance infrastructure?
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md transition-colors hover:bg-emerald-500/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
