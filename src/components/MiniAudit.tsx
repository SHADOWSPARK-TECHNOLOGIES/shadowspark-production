"use client";

import { useEffect, useState } from "react";
import { generateAuditAction } from "@/app/actions/generate-audit";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";

interface AuditData {
  recommendedPackage: string;
  headline: string;
  bullets: string[];
}

/** A single regulatory intelligence signal to display in the UI. */
interface RegulatorySignal {
  signalType: string;
  confidence: number;
  bonus: number;
}

interface MiniAuditProps {
  businessType?: string;
  goals?: string;
  features?: string[];
  recommendedPackage?: string;
  showCta?: boolean;

  /** Phase 4 — Firecrawl regulatory signals to display below the score. */
  regulatorySignals?: RegulatorySignal[];
  /** Phase 4 — HNW tier boost amount to show as a badge. */
  hnwTierBoost?: number;
}

/**
 * Maps raw signalType identifiers to human-readable labels.
 */
function formatSignalLabel(signalType: string): string {
  const MAP: Record<string, string> = {
    cbn_sandbox_inquiry: "CBN Regulatory Sandbox",
    sec_digital_asset_query: "SEC Digital Asset Compliance",
    nitda_data_protection_view: "NITDA Data Protection",
    nibss_interoperability_check: "NIBSS Interoperability",
  };
  return MAP[signalType] ?? signalType.replace(/_/g, " ");
}

export default function MiniAudit({
  businessType = "Logistics",
  goals = "Scaling operations",
  features = ["WhatsApp Automation"],
  recommendedPackage,
  showCta = true,
  regulatorySignals,
  hnwTierBoost,
}: MiniAuditProps) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runAudit() {
      const result = await generateAuditAction({ businessType, goals, features });
      // If a package was explicitly passed (e.g. from QualificationForm), use it
      if (recommendedPackage) {
        result.recommendedPackage = recommendedPackage.charAt(0).toUpperCase() + recommendedPackage.slice(1);
      }
      setData(result);
      setLoading(false);
    }
    runAudit();
  }, [businessType, goals, features, recommendedPackage]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 animate-pulse">
        <div className="h-4 w-24 bg-zinc-800 rounded-full mb-6" />
        <div className="h-10 w-3/4 bg-zinc-800 rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 w-full bg-zinc-800 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="audit-reveal w-full max-w-2xl bg-[#0A0A0A] border border-[#00FFFF]/20 rounded-3xl p-10 shadow-[0_0_50px_rgba(0,255,255,0.05)]">
      <Badge variant="outline" className="mb-6 border-[#00FFFF]/40 text-[#00FFFF] px-4 py-1 font-mono uppercase tracking-widest text-xs">
        {data?.recommendedPackage} Tier Recommended
        {hnwTierBoost !== undefined && hnwTierBoost > 0 && (
          <span className="ml-2 rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">
            HNW Boost: +{hnwTierBoost}
          </span>
        )}
      </Badge>
      
      <h3 className="text-3xl font-black text-white mb-8 leading-tight tracking-tight">
        {data?.headline}
      </h3>

      {/* ── Regulatory Intelligence Section (Phase 4) ──────────────────────── */}
      {regulatorySignals && regulatorySignals.length > 0 && (
        <div className="mb-8 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            ⚡ Regulatory Intelligence
          </h4>
          <ul className="mt-2 space-y-1">
            {regulatorySignals.map((signal, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {formatSignalLabel(signal.signalType)} — Confidence:{" "}
                {(signal.confidence * 100).toFixed(0)}%
                <span className="ml-auto text-amber-400">+{signal.bonus} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <ul className="space-y-6">
        {data?.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-4 group" data-index={i}>
            <CheckCircle2 className="w-6 h-6 text-[#00FFFF] mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
            <p className="text-zinc-400 text-lg leading-relaxed">{bullet}</p>
          </li>
        ))}
      </ul>

      {showCta && (
        <div className="mt-10 pt-8 border-t border-zinc-900 text-center">
           <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Diagnostic ID: SS-AUDIT-{Math.floor(Math.random() * 10000)}</p>
        </div>
      )}
    </section>
  );
}
