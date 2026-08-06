"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

type SovereignHeroProps = {
  headline: ReactNode;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
};

const orbitPanels = [
  "Website Layer",
  "WhatsApp AI",
  "Qualification Logic",
  "Operator Visibility",
];

export function SovereignHero({
  headline,
  subheadline,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
}: SovereignHeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden px-6">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.16, 0.3, 0.16] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[160px]"
      />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-xs font-mono tracking-widest text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            SYSTEM_STATUS: OPERATIONAL
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
            {headline}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-zinc-300 md:text-2xl">
            {subheadline}
          </p>

          <div className="mt-10 flex flex-col gap-5 md:flex-row">
            <Link
              href={ctaLink}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-8 py-4 font-bold text-black shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400"
            >
              {ctaText}
            </Link>
            <Link
              href={secondaryCtaLink}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-8 py-4 font-medium text-white transition-all hover:bg-white/5"
            >
              {secondaryCtaText}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_0_80px_rgba(0,229,255,0.08)] backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {orbitPanels.map((panel, index) => (
                  <motion.div
                    key={panel}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.08 }}
                    className="rounded-[1.5rem] border border-cyan-500/20 bg-black/40 p-5"
                  >
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">Layer {index + 1}</p>
                    <h3 className="mt-3 text-lg font-bold text-white">{panel}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Coordinated inside a single Obsidian/Cyan control surface.
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default SovereignHero;
