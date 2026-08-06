"use client";

import { motion } from "framer-motion";
import {
  Globe,
  MessageCircle,
  BrainCircuit,
  LayoutDashboard,
  MonitorPlay,
  BadgeDollarSign,
} from "lucide-react";

const nodes = [
  {
    icon: Globe,
    label: "Website",
    tooltip: "Traffic lands in a conversion-oriented website layer built for capture.",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    tooltip: "High-intent traffic is routed into guided WhatsApp conversations.",
  },
  {
    icon: BrainCircuit,
    label: "AI Logic",
    tooltip: "Qualification, routing, and follow-up decisions are handled automatically.",
  },
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    tooltip: "Operators monitor pipeline state, approvals, and system activity.",
  },
  {
    icon: MonitorPlay,
    label: "Demo",
    tooltip: "A live preview environment validates the proposed system before rollout.",
  },
  {
    icon: BadgeDollarSign,
    label: "Conversion",
    tooltip: "Qualified leads move into human sales or automated conversion paths.",
  },
];

export default function SystemArchitecture() {
  return (
    <section className="rounded-[2rem] border border-zinc-800 bg-[#050505] p-6 text-zinc-100 shadow-[0_0_80px_rgba(0,229,255,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-cyan-300">System Architecture</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Autonomous revenue infrastructure from click to conversion
        </h2>
      </div>

      <div className="relative mt-10">
        <motion.div
          aria-hidden="true"
          className="absolute left-6 right-6 top-[2.2rem] hidden h-px bg-cyan-400/20 lg:block"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="absolute top-0 h-px w-24 bg-cyan-300"
            animate={{ x: ["0%", "420%"] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {nodes.map((node, index) => {
            const Icon = node.icon;

            return (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="group relative rounded-[1.5rem] border border-cyan-400/20 bg-white/5 p-5 backdrop-blur-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-bold text-white">{node.label}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{node.tooltip}</p>

                <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-cyan-400/20 bg-[#03131a] p-3 text-xs leading-5 text-cyan-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {node.tooltip}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
