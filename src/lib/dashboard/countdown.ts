/**
 * countdown — BVN Lock Countdown Utility
 *
 * Extracted from duplicated logic in Topbar.tsx and ComplianceBadge.tsx.
 * Provides a single source of truth for the CBN BVN-Phone Lock deadline
 * countdown, used across marketing trust/conversion components.
 *
 * BVN Lock deadline: July 31, 2026 (per SEC Circular 26-1)
 */

const BVN_LOCK_DEADLINE = new Date("2026-07-31T23:59:59+01:00");

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total milliseconds remaining
  expired: boolean;
}

export function calcCountdown(): CountdownResult {
  const now = new Date();
  const total = BVN_LOCK_DEADLINE.getTime() - now.getTime();

  if (total <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      expired: true,
    };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    expired: false,
  };
}

export function formatCountdown(result: CountdownResult): string {
  if (result.expired) return "EXPIRED";
  return `${result.days}d ${result.hours}h ${result.minutes}m ${result.seconds}s`;
}
