/**
 * ComplianceBadge — SEC Circular 26-1 + BVN Compliance Badge
 *
 * Obsidian HUD Edition.
 * A composable inline badge cluster displaying Shadowspark's institutional
 * compliance posture: SEC Circular 26-1 capital adequacy and CBN BVN-Phone
 * Lock readiness. Designed to slot into hero sections, CTA clusters, or
 * anywhere trust reinforcement is needed.
 *
 * Variants:
 *   - "full" (default): SEC 26-1 + BVN side by side
 *   - "compact": Single "Certified" pill for space-constrained areas
 */

"use client";

import { ShieldCheck, Lock, Clock, AlertTriangle } from "lucide-react";
import { calcCountdown, type CountdownResult } from "@/lib/dashboard/countdown";

type ComplianceBadgeVariant = "full" | "compact";

type ComplianceBadgeProps = {
  variant?: ComplianceBadgeVariant;
  className?: string;
  showCountdown?: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive a display label and urgency flags from the shared CountdownResult.
 * Maintains backward-compatible label format for the ComplianceBadge UI.
 */
function deriveDisplay(result: CountdownResult): {
  label: string;
  days: number;
  isUrgent: boolean;
  isActive: boolean;
} | null {
  if (result.expired) {
    return { label: "LOCK ACTIVE", days: 0, isUrgent: true, isActive: true };
  }
  const days = result.days;
  if (days <= 5) {
    return {
      label: `${days} DAY${days === 1 ? "" : "S"} REMAINING`,
      days,
      isUrgent: true,
      isActive: true,
    };
  }
  return {
    label: `${days} DAYS REMAINING`,
    days,
    isUrgent: false,
    isActive: true,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function ComplianceBadge({
  variant = "full",
  className = "",
  showCountdown = true,
}: ComplianceBadgeProps) {
  const countdown = showCountdown ? deriveDisplay(calcCountdown()) : null;

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-400 backdrop-blur-md ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Certified · SEC 26-1 · BVN Lock Ready
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-3 ${className}`}
    >
      {/* SEC Circular 26-1 Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/5 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-gold-400 backdrop-blur-md">
        <ShieldCheck className="h-3 w-3" />
        <span className="hidden sm:inline">SEC Circular 26-1</span>
        <span className="sm:hidden">SEC 26-1</span>
        <span className="ml-1 rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[9px] tracking-tight">
          ₦2B
        </span>
      </div>

      {/* BVN Lock Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 backdrop-blur-md">
        <Lock className="h-3 w-3" />
        BVN-Phone Lock
        <span className="hidden sm:inline text-white/40 tracking-[0.1em]">
          Ready
        </span>
      </div>

      {/* Countdown (when active) */}
      {countdown && countdown.isActive && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider golden-transition duration-300 ${
            countdown.isUrgent
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-gold-500/20 bg-gold-500/5 text-gold-400"
          }`}
        >
          {countdown.isUrgent ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {countdown.label}
        </div>
      )}
    </div>
  );
}

export default ComplianceBadge;
