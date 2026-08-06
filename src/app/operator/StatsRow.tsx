"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";

type QueueMetrics = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

type Metrics = {
  crawl: QueueMetrics;
  leads: QueueMetrics;
};

function Sparkline({ values }: { values: number[] }) {
  const width = 120;
  const height = 36;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        points={points}
        className="text-cyan-400"
      />
    </svg>
  );
}

export default function StatsRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        const response = await fetch("/api/operator/queue-stats", { cache: "no-store" });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          throw new Error(result?.error || "Unable to load operator metrics.");
        }

        if (active) setMetrics(result);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load operator metrics.");
        }
      }
    }

    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Refresh every 5 seconds
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const crawlCards = [
    {
      label: "Crawl Queue (Waiting)",
      value: metrics?.crawl.waiting ?? "—",
    },
    {
      label: "Crawl Queue (Active)",
      value: metrics?.crawl.active ?? "—",
    },
    {
      label: "Crawl Queue (Completed)",
      value: metrics?.crawl.completed ?? "—",
    },
    {
      label: "Crawl Queue (Failed)",
      value: metrics?.crawl.failed ?? "—",
    },
  ];
  
  const leadCards = [
      {
        label: "Lead Sync (Waiting)",
        value: metrics?.leads.waiting ?? "—",
      },
      {
        label: "Lead Sync (Active)",
        value: metrics?.leads.active ?? "—",
      },
      {
        label: "Lead Sync (Completed)",
        value: metrics?.leads.completed ?? "—",
      },
      {
        label: "Lead Sync (Failed)",
        value: metrics?.leads.failed ?? "—",
      },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {[...crawlCards, ...leadCards].map((card, idx) => (
          <motion.div key={card.label} variants={item}>
            <GlassCard className="p-5 border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">{card.label}</p>
                <Sparkline values={[5, 10, 7, 12, 18, 13, 20]} />
              </div>
              <p className="mt-4 text-3xl font-black text-white drop-shadow-md">{card.value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
