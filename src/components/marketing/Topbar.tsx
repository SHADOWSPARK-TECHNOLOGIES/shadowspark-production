/**
 * Topbar — "The Compliance Anchor"
 *
 * Renders a fixed top navigation bar with:
 * - Minimalist Shadowspark logo
 * - SEC ARIP Badge (pulsing gold dot, clickable drawer)
 * - BVN Shield (pulsing green dot, "IDENTITY ANCHORED (May 1 Lock Compliant)")
 * - BVN Lock Countdown (shows days remaining until hard deadline)
 *   Reactive 60-second tick; urgency styling when ≤5 days remaining.
 *
 * "use client" needed for click/hover interactions and the reactive timer.
 */

"use client";

import { useState, useEffect } from "react";
import { SovereignLogo } from "@/components/marketing/SovereignLogo";
import { X, Clock, AlertTriangle } from "lucide-react";
import { calcCountdown, type CountdownResult } from "@/lib/dashboard/countdown";

// ── Constants ──────────────────────────────────────────────────────────────

/** Urgency threshold: show alert styling when ≤ this many days remain. */
const URGENCY_THRESHOLD_DAYS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive a display label and urgency flags from the shared CountdownResult.
 * Maintains backward-compatible label format for the Topbar UI.
 */
function deriveDisplay(result: CountdownResult): {
  label: string;
  days: number;
  isUrgent: boolean;
  isActive: boolean;
} {
  const days = result.days;
  const isActive = !result.expired;

  let label: string;
  if (result.expired) {
    label = "LOCK ACTIVE";
  } else if (days === 1) {
    label = "1 DAY TO BVN LOCK";
  } else {
    label = `${days} DAYS TO BVN LOCK`;
  }

  return {
    label,
    days,
    isUrgent: !result.expired && days <= URGENCY_THRESHOLD_DAYS,
    isActive,
  };
}

/**
 * Reactive countdown hook — recalculates every 60 seconds so the
 * display stays accurate without a full page refresh.
 * Uses lazy initializer to avoid cascading setState in the effect body.
 */
function useCountdown() {
  const [countdown, setCountdown] = useState(() => deriveDisplay(calcCountdown()));

  useEffect(() => {
    // Every 60 seconds, re-calculate the countdown from the interval
    const interval = setInterval(() => {
      setCountdown(deriveDisplay(calcCountdown()));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return countdown;
}

export function Topbar() {
  const [aripOpen, setAripOpen] = useState(false);
  const countdown = useCountdown();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Main bar */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <SovereignLogo size={28} animated={false} variant="emerald" />
            <span className="text-sm font-semibold tracking-tight text-white/90 font-sans">
              SHADOWSPARK
            </span>
          </div>

          {/* Badge cluster */}
          <div className="flex items-center gap-3">
            {/* May 1st BVN Lock Countdown */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider golden-transition duration-300 ${
                countdown.isUrgent
                  ? "border-red/40 bg-red/10 text-red-300 animate-pulse"
                  : countdown.isActive
                    ? "border-gold/40 bg-gold/10 text-gold-400"
                    : "border-red/20 bg-red/5 text-red-400"
              }`}
            >
              {countdown.isUrgent ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>{countdown.label}</span>
            </div>

            {/* SEC ARIP Badge */}
            <button
              type="button"
              onClick={() => setAripOpen(true)}
              className="group inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-gold-400 transition-all golden-transition duration-300 hover:border-gold/40 hover:bg-gold/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500" />
              </span>
              SEC ARIP
            </button>

            {/* BVN Shield Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald/5 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              IDENTITY ANCHORED
              <span className="hidden sm:inline text-white/40 tracking-[0.1em]">
                (May 1 Lock Compliant)
              </span>
            </div>
          </div>
        </div>

        {/* Subtle bottom border */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </header>

      {/* SEC ARIP Drawer (Tier II Glass Modal) */}
      {aripOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAripOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-lg animate-in slide-in-from-top-4 duration-500 golden-transition">
            <div className="glass-modal mx-6 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-500" />
                  </span>
                  <span className="text-xs font-mono uppercase tracking-[0.22em] text-gold-400">
                    SEC ARIP Status
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAripOpen(false)}
                  aria-label="Close ARIP status drawer"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* VASP License Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    License Status
                  </span>
                  <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Capital Reserve
                  </span>
                  <span className="text-xs font-mono text-white">₦ 500,000,000</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Incubation Track
                  </span>
                  <span className="text-xs font-mono text-gold-400">ARIP TIER 1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Circular 26-1 Deadline
                  </span>
                  <span className="text-xs font-mono text-red-400">June 2027</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Topbar;
