"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Truck,
  Stethoscope,
  GraduationCap,
  Briefcase,
  Hotel,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SovereignHero } from "@/components/ui/templates/SovereignHero";
import { GlassCard } from "@/components/ui/templates/GlassCard";

const industries = [
  {
    id: "real-estate",
    icon: Building2,
    title: "Real Estate",
    problem: "Leads from ads and WhatsApp go cold while waiting for agent replies. Multi-platform enquiries (Zillow, WhatsApp, Web) are hard to track.",
    solution: "Instant AI response and qualification. Automated property info delivery and viewing scheduling. Unified lead dashboard for agencies.",
    outcomes: ["-40% response delay", "+25% viewing rate", "100% lead capture"],
  },
  {
    id: "logistics",
    icon: Truck,
    title: "Logistics & Freight",
    problem: "Quotes requests are often unstructured, requiring manual back-and-forth for basic info like weight, origin, and destination.",
    solution: "WhatsApp-based quote bots that gather all required specs before alerting an operator. Structured data export to ERP/CRM.",
    outcomes: ["Zero manual triaging", "Instant quote delivery", "Complete request data"],
  },
  {
    id: "healthcare",
    icon: Stethoscope,
    title: "Healthcare & Clinics",
    problem: "Front desk is overwhelmed with routine booking enquiries, leading to missed calls and abandoned patient registrations.",
    solution: "24/7 AI triage and booking. Automated appointment reminders via WhatsApp. Patient data qualification for specialist routing.",
    outcomes: ["No missed registrations", "Reduced no-shows", "24/7 patient support"],
  },
  {
    id: "education",
    icon: GraduationCap,
    title: "Education & Training",
    problem: "Prospective students ask the same 10 questions about courses, pricing, and duration, slowing down the admissions office.",
    solution: "AI counselor that handles FAQs and qualifies student intent based on background and goals. Instant brochure delivery.",
    outcomes: ["-60% manual inquiry time", "Faster enrollment", "Tailored guidance"],
  },
  {
    id: "professional-services",
    icon: Briefcase,
    title: "Professional Services",
    problem: "Consultation requests lack qualification, leading to senior partners wasting time on leads that aren't a fit.",
    solution: "Multi-step qualification flows that filter leads by budget, project scope, and timeline before booking a discovery call.",
    outcomes: ["High-quality consultations", "Automated intake", "Predictable pipeline"],
  },
  {
    id: "hospitality",
    icon: Hotel,
    title: "Hospitality & Leisure",
    problem: "High volume of 'is it available' and 'how much' questions across WhatsApp and Web, resulting in lost bookings during peak times.",
    solution: "Instant availability checks and direct booking links. Automated upsells (airport pickup, spa) via conversation.",
    outcomes: ["Higher direct bookings", "Instant support", "Increased guest LTV"],
  },
];

export default function IndustriesClient() {
  return (
    <div className="bg-black text-zinc-400 font-sans selection:bg-cyan-500/30 min-h-screen">
      {/* ==================== HERO ==================== */}
      <SovereignHero
        headline={
          <>
            Revenue Systems for <br />
            <span className="text-cyan-500">Industry Leaders.</span>
          </>
        }
        subheadline="We don't build generic websites. We deploy industry-specific infrastructure designed to solve your unique conversion leaks."
        ctaText="See Real Estate Solution"
        ctaLink="#real-estate"
        secondaryCtaText="Contact Sales"
        secondaryCtaLink="/contact"
      />

      {/* ==================== INDUSTRY GRID ==================== */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Where response speed is the product.
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            ShadowSpark is engineered for sectors where the first to reply usually wins the contract.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {industries.map((industry, idx) => (
            <div
              key={industry.id}
              id={industry.id}
              className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-cyan-500/50 transition-all duration-300"
            >
              <industry.icon className="w-10 h-10 text-cyan-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold text-white mb-4">{industry.title}</h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-red-400/70 mb-2">The Revenue Leak</p>
                  <p className="text-sm leading-relaxed text-zinc-400">{industry.problem}</p>
                </div>
                
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-cyan-500/70 mb-2">The Solution</p>
                  <p className="text-sm leading-relaxed text-zinc-300 font-medium">{industry.solution}</p>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-2">
                    {industry.outcomes.map((outcome, i) => (
                      <span key={i} className="text-[10px] font-mono bg-cyan-500/10 text-cyan-500 px-2 py-1 rounded border border-cyan-500/20">
                        {outcome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Link
                href="/checkout/new"
                className="mt-8 w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white border border-zinc-700 rounded-lg group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-500 transition-all"
              >
                Deploy for {industry.title}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== COMMON TRAITS ==================== */}
      <section className="py-24 border-y border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Engineered for <br />
                <span className="text-cyan-500">Operational Autonomy.</span>
              </h2>
              <p className="text-lg text-zinc-300 leading-relaxed mb-8">
                Regardless of your industry, every ShadowSpark deployment shares the same 
                hardened core designed for high-volume revenue operations.
              </p>
              
              <div className="space-y-4">
                {[
                  { title: "Zero Lag Infrastructure", desc: "Built on Next.js 15 for sub-second page loads globally." },
                  { title: "Encryption by Default", desc: "Enterprise-grade security for all lead and patient data." },
                  { title: "Seamless Handoff", desc: "AI qualifies, then routes to your team exactly when needed." },
                ].map((trait, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      <ShieldCheck className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{trait.title}</h4>
                      <p className="text-sm text-zinc-500">{trait.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 p-8 flex flex-col justify-between">
                <Zap className="w-8 h-8 text-cyan-500" />
                <div>
                  <p className="text-3xl font-bold text-white">99.9%</p>
                  <p className="text-xs font-mono uppercase text-zinc-500">System Uptime</p>
                </div>
              </div>
              <div className="aspect-square rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-8 flex flex-col justify-between">
                <CheckCircle2 className="w-8 h-8 text-cyan-500" />
                <div>
                  <p className="text-3xl font-bold text-white">Instant</p>
                  <p className="text-xs font-mono uppercase text-zinc-500">Lead Response</p>
                </div>
              </div>
              <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 p-8 flex flex-col justify-between">
                <Building2 className="w-8 h-8 text-cyan-500" />
                <div>
                  <p className="text-3xl font-bold text-white">Global</p>
                  <p className="text-xs font-mono uppercase text-zinc-500">Edge Deployment</p>
                </div>
              </div>
              <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 p-8 flex flex-col justify-between">
                <Briefcase className="w-8 h-8 text-cyan-500" />
                <div>
                  <p className="text-3xl font-bold text-white">API</p>
                  <p className="text-xs font-mono uppercase text-zinc-500">Ready Integration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to close your revenue leaks?
          </h2>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-10">
            Select your industry to see a live demo of how ShadowSpark can transform your conversion rate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout/new"
              className="px-8 py-4 bg-cyan-500 text-black font-bold rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-all"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border border-zinc-700 text-white rounded-lg hover:bg-white/5 transition-all"
            >
              Book Strategic Call
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-900 text-center text-xs font-mono uppercase tracking-[0.3em] text-zinc-600">
        © 2026 ShadowSpark Technologies · Industry Solutions · v2.0.0
      </footer>
    </div>
  );
}
