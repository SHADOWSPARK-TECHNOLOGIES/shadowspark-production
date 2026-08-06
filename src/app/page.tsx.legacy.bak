"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  MessageSquare,
  Workflow,
  Eye,
  CheckCircle2,
  Play,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { SovereignHero } from "@/components/ui/templates/SovereignHero";
import { GlassCard } from "@/components/ui/templates/GlassCard";
import { SovereignFooter } from "@/components/ui/SovereignFooter";
import TrustBadges from "@/components/ui/TrustBadges";

export default function EnterpriseHomepage() {
  return (
    <div className="bg-black text-zinc-400 font-sans selection:bg-cyan-500/30">
      {/* ==================== HERO ==================== */}
      <SovereignHero
        headline={
          <>
            Build Once. <span className="text-cyan-500">Sell Forever.</span>
          </>
        }
        subheadline="ShadowSpark designs and deploys AI-powered revenue systems that capture, qualify, and convert your customers automatically."
        ctaText="Deploy My Revenue System"
        ctaLink="/checkout/new"
        secondaryCtaText="Watch System Demo"
        secondaryCtaLink="#system-demo"
      />

      {/* ==================== PROBLEM SECTION ==================== */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Most businesses don&apos;t have a traffic problem.
                <br />
                <span className="text-cyan-500">They have a conversion problem.</span>
              </h2>
              <p className="text-lg text-zinc-300 leading-relaxed">
                Leads come in, replies are delayed, follow-ups get missed, and revenue
                leaks out quietly. ShadowSpark closes that gap with systems that respond
                instantly and move prospects forward automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5">
                <p className="text-red-400 text-sm font-mono uppercase tracking-wider mb-3">
                  Without System
                </p>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✕</span> Missed enquiries
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✕</span> Slow replies
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✕</span> Broken follow-up
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✕</span> No sales visibility
                  </li>
                </ul>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                <p className="text-cyan-400 text-sm font-mono uppercase tracking-wider mb-3">
                  With ShadowSpark
                </p>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" /> Instant capture
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" /> AI qualification
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" /> Automated follow-up
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" /> Operator visibility
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SYSTEM LAYERS ==================== */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            One system. Four layers of growth.
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            From presence to automation, every layer works together to turn attention into revenue.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              id: "presence",
              icon: Globe,
              title: "Presence Infrastructure",
              items: ["High-performance website", "Mobile-first UI", "Conversion architecture", "Hosting & uptime"],
            },
            {
              id: "conversation",
              icon: MessageSquare,
              title: "Conversation Intelligence",
              items: ["WhatsApp AI assistant", "Lead capture flows", "Instant response logic", "Qualification prompts"],
            },
            {
              id: "automation",
              icon: Workflow,
              title: "Automation Engine",
              items: ["Follow-up sequences", "Booking/payment workflows", "Routing & escalation", "Handoff logic"],
            },
            {
              id: "visibility",
              icon: Eye,
              title: "Operator Visibility",
              items: ["Lead pipeline", "Approval flows", "Demo generation", "Business insight layer"],
            },
          ].map((layer, idx) => (
            <Link
              key={idx}
              href={`/solutions?layer=${layer.id}`}
              className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 transition-all hover:border-cyan-500/50 hover:bg-zinc-900/50 group"
            >
              <layer.icon className="w-8 h-8 text-cyan-500 mb-5 transition-transform group-hover:scale-110" />
              <h3 className="text-white font-bold text-lg mb-3">{layer.title}</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                {layer.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-cyan-500/70 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-500 opacity-0 transition-opacity group-hover:opacity-100">
                EXPLORE LAYER <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ==================== VIDEO SECTION ==================== */}
      <section id="system-demo" className="py-24 border-y border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            See the System in Motion
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-12">
            Watch how ShadowSpark captures a lead, qualifies intent, deploys a tailored flow,
            and turns conversations into revenue.
          </p>

          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="aspect-video bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                  <Play className="w-8 h-8 text-cyan-500 fill-cyan-500" />
                </div>
                <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                  System Walkthrough (0:48)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12 mt-10">
            <span className="text-sm font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full" /> Capture
            </span>
            <span className="text-sm font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full" /> Qualify
            </span>
            <span className="text-sm font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full" /> Convert
            </span>
          </div>
        </div>
      </section>

      {/* ==================== INDUSTRY PROOF ==================== */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Designed for businesses where response speed matters
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { id: "real-estate", industry: "Real Estate", outcome: "Leads from ads and WhatsApp are captured, qualified, and routed faster." },
            { id: "logistics", industry: "Logistics", outcome: "Enquiries turn into structured requests instead of disappearing in chat." },
            { id: "healthcare", industry: "Healthcare", outcome: "Patient enquiries are triaged and booked without manual delays." },
            { id: "education", industry: "Education", outcome: "Prospective students receive instant course and admission guidance." },
            { id: "professional-services", industry: "Professional Services", outcome: "Consultation requests are qualified and scheduled automatically." },
            { id: "hospitality", industry: "Hospitality", outcome: "Reservations and enquiries are handled 24/7 with zero wait." },
          ].map((item, idx) => (
            <Link 
              key={idx} 
              href={`/industries#${item.id}`}
              className="p-6 rounded-xl border border-zinc-800 bg-black hover:border-cyan-500/50 transition-all group"
            >
              <h4 className="text-white font-bold mb-2 group-hover:text-cyan-400 transition-colors">{item.industry}</h4>
              <p className="text-sm text-zinc-400">{item.outcome}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                EXPLORE SOLUTION <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-8">
        <blockquote className="max-w-4xl mx-auto text-center italic text-xl md:text-2xl text-zinc-200">
          <span className="text-cyan-400">“</span>
          Businesses lose <span className="text-cyan-400">40-70%</span> of leads to slow
          response. ShadowSpark closes that gap with autonomous infrastructure.
          <span className="text-cyan-400">”</span>
        </blockquote>
      </section>

      {/* ==================== PRICING ==================== */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose the system that matches your stage of growth
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Every ShadowSpark system is designed to reduce response delays, improve conversion,
              and make revenue more predictable.
            </p>
            <p className="text-sm font-mono text-cyan-500/80 mt-4">
              Monthly subscription. Managed delivery. Ongoing support.
            </p>
          </div>

          <div className="text-center mb-12">
            <p className="text-xl text-white/80 italic max-w-3xl mx-auto border-l-4 border-cyan-500 pl-6 py-2">
              “Most businesses don&apos;t have a traffic problem. They have a conversion problem. ShadowSpark fixes both.”
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                name: "Launch System",
                price: "$149",
                narrative: "Digital Foundation - Replaces web hosting, forms, manual sorting",
                features: [
                  "AI-powered website infrastructure",
                  "Lead capture + WhatsApp integration",
                  "Automated response system",
                  "Secure hosting + uptime",
                ],
                cta: "Start with Launch",
                link: "/checkout/launch",
                highlight: false,
              },
              {
                name: "Growth System",
                price: "$349",
                narrative: "Digital Employee - 24/7 WhatsApp qualification + CRM follow-up",
                features: [
                  "Full AI chatbot (24/7 qualification)",
                  "Automated follow-up engine",
                  "Multi-page conversion website",
                  "Lead tracking dashboard",
                ],
                cta: "Deploy Growth",
                link: "/checkout/growth",
                highlight: true,
                badge: "Most Popular",
              },
              {
                name: "Autonomous System",
                price: "$599",
                narrative: "Digital Operations Manager - End-to-end sales automation",
                features: [
                  "Full sales automation workflows",
                  "Payment + booking integration",
                  "AI behavior optimization",
                  "Advanced analytics + insights",
                ],
                cta: "Scale with Automation",
                link: "/checkout/autonomous",
                highlight: false,
              },
              {
                name: "Enterprise Infrastructure",
                price: "Custom",
                narrative: "Bespoke deployment for high-volume operations",
                features: [
                  "Dedicated AI agents",
                  "Multi-channel automation",
                  "Custom backend systems",
                  "Priority deployment + support",
                ],
                cta: "Talk to ShadowSpark",
                link: "/contact",
                highlight: false,
              },
            ].map((tier, idx) => (
              <GlassCard
                key={idx}
                title={tier.name}
                description={tier.narrative}
                highlighted={tier.highlight}
                className={`relative flex h-full flex-col p-6 ${
                  tier.highlight
                    ? "border-cyan-500 bg-cyan-500/8 shadow-[0_0_40px_rgba(0,229,255,0.18)]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {tier.badge && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-black">
                    {tier.badge}
                  </span>
                )}
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  {tier.price !== "Custom" && <span className="text-sm text-zinc-500">/month</span>}
                </div>
                <ul className="space-y-3 text-sm text-zinc-300 mb-8 flex-grow">
                  {tier.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.link}
                  className={`w-full py-3 text-center rounded-lg font-medium transition-all ${
                    tier.highlight
                      ? "bg-cyan-500 text-black hover:bg-cyan-400"
                      : "border border-zinc-700 text-white hover:bg-white/5"
                  }`}
                >
                  {tier.cta}
                </Link>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DEMO OFFER ==================== */}
      <section className="py-24 max-w-5xl mx-auto px-6 text-center">
        <div className="border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-transparent rounded-3xl p-10 md:p-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Unlock a tailored system demo before you commit
          </h2>
          <p className="text-lg text-zinc-300 max-w-3xl mx-auto mb-8">
            We build a focused preview of how your business can capture, qualify, and convert leads
            with ShadowSpark. Your demo deposit is credited toward your system if you move forward.
          </p>
          <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 rounded-full px-6 py-2 mb-8">
            <span className="text-cyan-400 font-mono text-sm">
              Unlock Your Custom System Demo — $1 (₦1,000 equivalent)
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout/new"
              className="px-8 py-4 bg-cyan-500 text-black font-bold rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-all"
            >
              Start Qualification Audit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/process"
              className="px-8 py-4 border border-zinc-700 text-white rounded-lg hover:bg-white/5 transition-all"
            >
              See Demo Process
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== PROCESS ==================== */}
      <section className="py-24 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What happens after you start
            </h2>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { step: "01", title: "Qualification", desc: "We understand your business flow and goals." },
              { step: "02", title: "Tailored Audit", desc: "You receive a custom system blueprint." },
              { step: "03", title: "Demo Deployment", desc: "We deploy a live preview of your system." },
              { step: "04", title: "Approval", desc: "You review, refine, and approve." },
              { step: "05", title: "Managed Launch", desc: "Your system goes live with full support." },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-500 font-mono font-bold">{item.step}</span>
                </div>
                <h4 className="text-white font-bold mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-24 text-center border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Deploy a revenue system that works 24/7
          </h2>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-10">
            If your business depends on leads, speed, follow-up, or conversion, ShadowSpark
            gives you a system that performs without waiting for manual effort.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout/new"
              className="px-8 py-4 bg-cyan-500 text-black font-bold rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-all"
            >
              Deploy My System
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border border-zinc-700 text-white rounded-lg hover:bg-white/5 transition-all"
            >
              Book Enterprise Call
            </Link>
          </div>
        </div>
      </section>
      
      <TrustBadges />
      <SovereignFooter />
    </div>
  );
}
