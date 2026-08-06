"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  MonitorPlay,
  Rocket,
  Search,
} from "lucide-react";
import Link from "next/link";
import { ProcessStepper } from "@/components/ui/ProcessStepper";
import { SovereignHero } from "@/components/ui/templates/SovereignHero";

const steps = [
  {
    step: "01",
    title: "Qualification",
    description: "We understand your business flow and goals.",
    icon: Search,
    href: "/solutions?layer=presence",
  },
  {
    step: "02",
    title: "Tailored Audit",
    description: "You receive a custom system blueprint.",
    icon: FileText,
    href: "/demo/demo-preview",
  },
  {
    step: "03",
    title: "Demo Deployment",
    description: "We deploy a live preview of your system.",
    icon: MonitorPlay,
    href: "/checkout/new",
  },
  {
    step: "04",
    title: "Approval & Refinement",
    description: "You review and approve.",
    icon: BadgeCheck,
    href: "/contact",
  },
  {
    step: "05",
    title: "Managed Launch",
    description: "Your system goes live with full support.",
    icon: Rocket,
    href: "/contact",
  },
];

export default function ProcessClient() {
  return (
    <div className="min-h-screen bg-black font-sans text-zinc-400 selection:bg-cyan-500/30">
      <SovereignHero
        headline={
          <>
            What Happens <span className="text-cyan-500">After You Start</span>
          </>
        }
        subheadline="A structured deployment path from audit to autonomous revenue."
        ctaText="Start Your Qualification Audit"
        ctaLink="/checkout/new"
        secondaryCtaText="See Solutions"
        secondaryCtaLink="/solutions"
      />

      <section className="border-t border-zinc-900 bg-zinc-950/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-400/80">
              Deployment Path
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Five structured steps from intake to launch.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-300">
              Every deployment follows a defined sequence so your team gets clarity,
              a live working preview, and a managed launch without operational guesswork.
            </p>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl">
            <ProcessStepper steps={steps} activeStep="01" />
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-transparent px-8 py-12"
          >
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-300/80">
              Final Step
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Start Your Qualification Audit
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
              We map your current lead flow, identify response gaps, and define the
              autonomous system your business actually needs.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/checkout/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 font-bold text-black transition-all hover:bg-cyan-400"
              >
                Start Your Qualification Audit
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
