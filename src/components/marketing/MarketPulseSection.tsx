/**
 * MarketPulseSection — RAG Regulatory Feed
 *
 * Obsidian HUD Edition.
 * Renders the Market Pulse section with a live regulatory signal feed
 * ingested from CBN, SEC, NITDA, and NIBSS portals via the Firecrawl
 * semantic bridge.
 */

import { Suspense } from "react";
import Link from "next/link";
import { ScrollText, FileText, ArrowRight } from "lucide-react";
import { MarketPulse } from "@/components/marketing/MarketPulse";

export function MarketPulseSection() {
  return (
    <section className="relative border-t border-white/5 py-24">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,146,42,0.03),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Section header */}
        <div className="mb-4 flex items-center gap-2.5">
          <ScrollText className="h-4 w-4 text-gold-500" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-white font-display">
              Market Pulse
            </h2>
            <p className="text-[10px] font-mono text-zinc-600">
              REGULATORY SIGNAL FEED — FIRECRAWL RAG BRIDGE
            </p>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-zinc-500 font-sans">
          Real-time regulatory signals ingested from CBN, SEC, NITDA, and NIBSS
          portals via the Firecrawl semantic bridge. Each signal includes a
          Semantic Proximity score indicating alignment strength.
        </p>

        <Suspense
          fallback={
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-full animate-pulse rounded-xl bg-white/3"
                />
              ))}
            </div>
          }
        >
          <MarketPulse />
        </Suspense>

        {/* CTA link */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/admin/health"
            className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-gold-400 golden-transition duration-300 hover:text-gold-300"
          >
            <FileText className="h-3.5 w-3.5" />
            View Full Q2 2026 Regulatory Intelligence Report
            <ArrowRight className="h-3.5 w-3.5 golden-transition duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default MarketPulseSection;
