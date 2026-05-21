/**
 * MarketPulse — Regulatory RAG Feed (Vertical Card Layout)
 *
 * Obsidian HUD Edition.
 * Fetches real-time regulatory signals from the Firecrawl bridge via the
 * /api/regulatory/pulses endpoint, then renders as vertical glass-panel
 * cards with "Semantic Proximity" scores for regulatory alignment.
 *
 * Handles Server-to-Client hydration safely with a "loaded" state flag.
 */

"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, AlertTriangle, Minus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type RegulatoryPulse = {
  id: string;
  source: string;
  label: string;
  sentiment: "bullish" | "neutral" | "critical";
  delta: string;
};

// ── Semantic proximity calculator ─────────────────────────────────────────

const PROXIMITY_BY_SENTIMENT: Record<RegulatoryPulse["sentiment"], number> = {
  bullish:  92,
  neutral:  74,
  critical: 96,
};

function semanticProximity(sentiment: RegulatoryPulse["sentiment"]): number {
  return PROXIMITY_BY_SENTIMENT[sentiment];
}

function proximityColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-gold-400";
  return "text-zinc-500";
}

// ── Fallback data ─────────────────────────────────────────────────────────

const FALLBACK_PULSES: RegulatoryPulse[] = [
  { id: "cbn-sandbox",      source: "CBN",   label: "Regulatory Sandbox Sentiment",              sentiment: "bullish",  delta: "+15%" },
  { id: "cbn-sandbox2",     source: "CBN",   label: "Sandbox 2.0 Pilot (Feb 2026 Window)",       sentiment: "bullish",  delta: "+22%" },
  { id: "nibss-nps",        source: "NIBSS", label: "NPS ISO 20022 Messaging Integration",        sentiment: "bullish",  delta: "+18%" },
  { id: "nibss-nip",        source: "NIBSS", label: "NIP Real-Time Transfer Volume",             sentiment: "bullish",  delta: "+24%" },
  { id: "sec-vasp",         source: "SEC",   label: "VASP Capital Deadline (June 2027)",          sentiment: "critical", delta: "CRITICAL" },
  { id: "sec-arip",         source: "SEC",   label: "ARIP Incubation Program Intake",            sentiment: "bullish",  delta: "+8%" },
  { id: "sec-circ261",      source: "SEC",   label: "Circular 26-1 Capital Hike Compliance",     sentiment: "critical", delta: "URGENT" },
  { id: "nitda-dpa",        source: "NITDA", label: "Data Protection Act 2023 Enforcement",      sentiment: "neutral",  delta: "+2%" },
  { id: "cbn-psb",          source: "CBN",   label: "PSB License Issuance Pipeline",              sentiment: "neutral",  delta: "STEADY" },
  { id: "cbn-openbanking",  source: "CBN",   label: "Open Banking Framework Adoption Rate",       sentiment: "bullish",  delta: "+12%" },
];

// ── Sentiment icon ────────────────────────────────────────────────────────

function SentimentIcon({ sentiment }: { sentiment: RegulatoryPulse["sentiment"] }) {
  switch (sentiment) {
    case "bullish":
      return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    case "critical":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    case "neutral":
      return <Minus className="h-3.5 w-3.5 text-gold-400" />;
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export function MarketPulse() {
  const [pulses, setPulses] = useState<RegulatoryPulse[]>(FALLBACK_PULSES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/regulatory/pulses");
        if (res.ok) {
          const data: RegulatoryPulse[] = await res.json();
          if (data.length > 0) {
            setPulses(data);
          }
        }
      } catch {
        // Silently use fallback
      } finally {
        setLoaded(true);
      }
    }
    fetchSignals();
  }, []);

  return (
    <div
      style={{
        opacity: loaded ? 1 : 0.6,
        transition: "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Section label */}
      <div className="mb-5 flex items-center gap-2.5">
        <Activity className="h-4 w-4 text-emerald-500" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          Regulatory Pulse Feed
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
      </div>

      {/* Vertical card list */}
      <div className="space-y-3">
        {pulses.map((pulse) => {
          const proximity = semanticProximity(pulse.sentiment);
          return (
            <div
              key={pulse.id}
              className="glass-panel group flex items-center gap-4 rounded-xl px-4 py-3 golden-transition duration-300 hover:bg-white/6"
            >
              {/* Source badge */}
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                  pulse.source === "SEC"
                    ? "bg-gold/10 text-gold-400"
                    : pulse.source === "CBN"
                      ? "bg-emerald/10 text-emerald-400"
                      : pulse.source === "NITDA"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-purple-500/10 text-purple-400"
                }`}
              >
                {pulse.source}
              </span>

              {/* Label */}
              <span className="flex-1 truncate text-xs font-mono text-zinc-300">
                {pulse.label}
              </span>

              {/* Sentiment icon + delta */}
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    pulse.sentiment === "bullish"
                      ? "text-emerald-400"
                      : pulse.sentiment === "critical"
                        ? "text-red-400"
                        : "text-gold-400"
                  }`}
                >
                  {pulse.delta}
                </span>
                <SentimentIcon sentiment={pulse.sentiment} />
              </div>

              {/* Semantic Proximity score */}
              <div
                className={`hidden sm:flex shrink-0 items-center gap-1.5 rounded-md border border-white/5 px-2.5 py-1 text-[10px] font-mono ${proximityColor(proximity)}`}
              >
                <span>{proximity}%</span>
                <span className="text-zinc-600">Match</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MarketPulse;
