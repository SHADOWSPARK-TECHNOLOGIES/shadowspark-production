"use client";

import { motion } from "framer-motion";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  Globe,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { AuroraBackground } from "@/components/ui/templates/AuroraBackground";
import { AppleCardsCarousel } from "@/components/ui/apple-cards-carousel";
import { BrowserWindow } from "@/components/ui/BrowserWindow";
import { ContextualFooter } from "@/components/ui/ContextualFooter";

const layers = [
  {
    id: "presence",
    step: "Layer 1",
    title: "Presence Infrastructure",
    shortLabel: "The Foundation",
    icon: Globe,
    accent: "#38bdf8",
    problem:
      "Most websites are slow, generic, and act as passive information boards. They don't guide the user towards a conversion, causing high bounce rates and wasted ad spend.",
    solution:
      "High-performance, edge-deployed digital environments designed exclusively for conversion. We build the optimal path for user action.",
    outcome: "Sharper first impression, lower bounce, and a cleaner path into booked conversations.",
    features: [
      "Sub-second global page loads (Next.js 15).",
      "Conversion-architected layouts and psychology-driven UI.",
      "Frictionless lead capture forms and smart CTAs.",
      "Enterprise-grade security and hosting.",
    ],
  },
  {
    id: "conversation",
    step: "Layer 2",
    title: "Conversation Intelligence",
    shortLabel: "The AI Operator",
    icon: MessageSquare,
    accent: "#22d3ee",
    problem:
      "Leads expect replies in seconds, not hours. Manual handling of WhatsApp and web chat leads to dropped conversations, cold prospects, and overwhelmed staff.",
    solution:
      "An intelligent, always-on AI assistant integrated directly into WhatsApp and your website, instantly engaging and qualifying every inquiry.",
    outcome: "Higher response speed, cleaner qualification, and fewer leads going cold overnight.",
    features: [
      "Instant AI response to WhatsApp & Web inquiries (24/7/365).",
      "Dynamic lead qualification flows (budget, timeline, intent).",
      "Multi-lingual support and natural conversation handling.",
      "Spam filtering and basic FAQ resolution.",
    ],
  },
  {
    id: "automation",
    step: "Layer 3",
    title: "Automation Engine",
    shortLabel: "The Workflow",
    icon: Workflow,
    accent: "#f59e0b",
    problem:
      "Getting the lead is only half the battle. Follow-ups are inconsistent, data gets lost between platforms, and manual scheduling causes endless back-and-forth.",
    solution:
      "Invisible background logic that connects the dots. We automate the repetitive tasks between capture and closing.",
    outcome: "Less operator drag, tighter follow-up discipline, and faster movement toward payment.",
    features: [
      "Automated multi-channel follow-up sequences.",
      "Seamless booking and calendar integration.",
      "Direct payment processing within conversational flows.",
      "Conditional routing (e.g., send high-value leads directly to senior reps).",
    ],
  },
  {
    id: "visibility",
    step: "Layer 4",
    title: "Operator Visibility",
    shortLabel: "The Command Center",
    icon: Eye,
    accent: "#a78bfa",
    problem:
      "Sales teams are flying blind, lacking context when they finally take over a conversation. Data is siloed, making it impossible to measure system performance or pinpoint drop-offs.",
    solution:
      "A centralized, unified dashboard where human operators take control. See exactly what the AI has done and step in seamlessly.",
    outcome: "Faster handoffs, clearer priorities, and a system your team can actually trust in production.",
    features: [
      "Unified lead pipeline and conversation history.",
      "Real-time system health and conversion analytics.",
      "\"Handoff\" alerts for high-value or complex queries.",
      "One-click approval flows for quotes and proposals.",
    ],
  },
];

const architectureChecks = [
  "If one layer is broken, revenue leaks.",
  "Every layer contributes to a single conversion path.",
  "Zero leakage from first click to final conversion.",
];

const trustStats = [
  {
    label: "Response Window",
    value: "< 60s",
    detail: "First-touch AI qualification cuts the dead time between interest and response.",
  },
  {
    label: "Conversion Path",
    value: "4 layers",
    detail: "One coordinated path from page view to booked conversation and payment-ready follow-up.",
  },
  {
    label: "Control Model",
    value: "AI + Human",
    detail: "Automation handles speed; operators only step in where trust and pricing nuance matter.",
  },
];

const proofBand = [
  {
    title: "Response-time lift",
    value: "Faster first touch",
    detail: "AI qualification keeps high-intent leads from cooling off while the team is offline.",
  },
  {
    title: "Use-case fit",
    value: "WhatsApp + web",
    detail: "Designed for businesses where leads arrive through chat, forms, and follow-up friction.",
  },
  {
    title: "Commercial outcome",
    value: "Cleaner close path",
    detail: "Better CTA routing, less manual delay, and tighter operator handoffs when the lead is ready.",
  },
];

function SolutionsContent() {
  const searchParams = useSearchParams();
  const layerParam = searchParams.get("layer");
  const initialLayerId =
    layerParam && layers.some((l) => l.id === layerParam)
      ? layerParam
      : layers[0].id;
  const [activeLayerId, setActiveLayerId] = useState(initialLayerId);

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0];

  return (
    <AuroraBackground className="min-h-screen font-sans text-zinc-400 selection:bg-emerald-500/30">
      <section className="relative px-6 pb-12 pt-10 sm:pb-16 sm:pt-14">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,20,0.94)_0%,rgba(2,6,23,0.9)_100%)] px-6 py-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:px-10 sm:py-10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="absolute -left-12 top-12 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -right-12 bottom-8 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

            <div className="relative grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.26em] text-cyan-100">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                  Sovereign Revenue Surface
                </div>
                <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl xl:text-[4.8rem]">
                  Four integrated layers that turn attention into booked revenue.
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  ShadowSpark does not sell a prettier website. It deploys a decision-grade
                  revenue system: premium surface, instant qualification, automated follow-up,
                  and operator visibility in one controlled stack.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/checkout/new"
                    className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-cyan-300 px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-200"
                  >
                    Book Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/12 bg-white/3 px-7 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:border-cyan-300/25 hover:bg-white/5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat on WhatsApp
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {architectureChecks.map((check) => (
                    <div
                      key={check}
                      className="rounded-full border border-white/10 bg-white/3 px-4 py-2 text-sm text-slate-300"
                    >
                      {check}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {trustStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.7rem] border border-white/10 bg-white/4 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "Designed for high-intent WhatsApp and web lead flows.",
              "Built to reduce dead time between inquiry, qualification, and booked action.",
              "Premium surface backed by measurable operator control and AI response discipline.",
            ].map((line) => (
              <div
                key={line}
                className="rounded-[1.6rem] border border-white/8 bg-black/20 px-5 py-4 text-sm leading-6 text-slate-300"
              >
                {line}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {proofBand.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.7rem] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(8,12,20,0.72),rgba(4,8,16,0.78))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">
                  {item.title}
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-white">{item.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-400/80">
              Four Layers
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Decision-grade infrastructure, one revenue layer at a time.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-300">
              Inspect each layer as an executive decision: what breaks, what it costs, and
              what the deployed system does to close the gap.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.06fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4 }}
            >
              <BrowserWindow
                title="Architecture Layers"
                eyebrow="Decision surface"
                contentClassName="w-full bg-slate-900/50"
                chrome={
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    Active: {activeLayer.step}
                  </div>
                }
              >
                <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.1),transparent)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(14,165,233,0.05),transparent)]" />
                </div>

                <div className="relative z-10">
                  <AppleCardsCarousel
                    items={layers.map((layer) => ({
                      id: layer.id,
                      title: layer.title,
                      category: layer.step,
                      summary: layer.solution,
                      outcome: layer.outcome,
                      accent: layer.accent,
                      icon: layer.icon,
                    }))}
                    activeId={activeLayerId}
                    onSelect={setActiveLayerId}
                  />
                </div>
              </BrowserWindow>
            </motion.div>

            <motion.div
              key={activeLayer.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <BrowserWindow
                className="h-full"
                title={activeLayer.title}
                eyebrow={`${activeLayer.step} · ${activeLayer.shortLabel}`}
                contentClassName="grid gap-6 p-6 sm:p-8"
                chrome={
                  <div
                    className="rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/90"
                    style={{
                      borderColor: `${activeLayer.accent}55`,
                      backgroundColor: `${activeLayer.accent}18`,
                    }}
                  >
                    Active decision layer
                  </div>
                }
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${activeLayer.accent}, transparent)`,
                  }}
                />
                <div className="grid gap-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                        {activeLayer.outcome}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-rose-300/10 bg-rose-300/4 p-5">
                      <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-rose-200/80">
                        Leakage if missing
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{activeLayer.problem}</p>
                    </div>

                    <div
                      className="rounded-[1.6rem] border p-5"
                      style={{
                        borderColor: `${activeLayer.accent}30`,
                        backgroundColor: `${activeLayer.accent}10`,
                      }}
                    >
                      <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-100/80">
                        System response
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/90">{activeLayer.solution}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
                      What gets deployed
                    </p>
                    <div className="mt-4 grid gap-3">
                      {activeLayer.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3 rounded-[1.4rem] border border-white/8 bg-white/3 px-4 py-4"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                          <p className="text-sm leading-6 text-slate-300">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BrowserWindow>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/45 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-400/80">
              Operating Model
            </p>
              <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
                AI when you need speed. Humans when you need empathy.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                Our systems aren{"'"}t designed to replace your sales team; they are designed
                to protect their time. The system handles the 80% of repetitive, low-value
                interactions, seamlessly handing off the qualified 20% to your operators
                with full context.
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">
                The business outcome is simple: your team spends less time chasing cold leads
                and more time closing the people already showing intent.
              </p>
            </motion.div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.9),rgba(6,10,19,0.88))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.3)]">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                <Bot className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/80">
                  Autonomous Systems + Human Oversight
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Automation owns speed, repetition, and qualification. Operators step in where judgment and trust matter most.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-cyan-500/15 bg-black/30 p-4">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300/80">
                  Autonomous 80%
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Instant replies, qualification, routing, reminders, and repetitive follow-up.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
                  Human 20%
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Complex objections, pricing nuance, approvals, and relationship-driven closing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45 }}
            className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-transparent px-8 py-12"
          >
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-300/80">
              Final Decision
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Stop losing leads to slow responses.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
              Book a live walkthrough of the system, see the qualification flow, and decide
              where your revenue surface is leaking right now.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/checkout/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 font-bold text-black transition-all hover:bg-cyan-400"
              >
                Book Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-4 font-medium text-white transition-all hover:bg-white/5"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </Link>
            </div>
            <div className="mt-8 flex justify-center">
              <ContextualFooter href="/process" label="Deployment Path" />
            </div>
          </motion.div>
        </div>
      </section>
    </AuroraBackground>
  );
}

function SolutionsPageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-6 pt-10">
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/3" />
        <div className="mt-6 h-16 w-3/4 animate-pulse rounded-2xl bg-white/3" />
        <div className="mt-4 h-6 w-1/2 animate-pulse rounded-xl bg-white/3" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.06fr]">
          <div className="h-96 animate-pulse rounded-[2.4rem] bg-white/3" />
          <div className="h-96 animate-pulse rounded-[2.4rem] bg-white/3" />
        </div>
      </div>
    </div>
  );
}

export default function SolutionsPage() {
  return (
    <Suspense fallback={<SolutionsPageSkeleton />}>
      <SolutionsContent />
    </Suspense>
  );
}
