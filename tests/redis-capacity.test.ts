/**
 * FC-07: Redis capacity planning — unit tests
 *
 * Tests the capacity-check logic that is applied in:
 *   src/app/api/cron/health-check/route.ts  (section 4. Redis Capacity)
 *   scripts/health/worker-check.sh
 *
 * The pure calculation helpers are extracted here so they can be tested
 * without a live Redis connection.
 */

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Pure helpers (mirror of the logic in the cron route)
// ---------------------------------------------------------------------------

const UPSTASH_FREE_TIER_BYTES = 256 * 1024 * 1024; // 256 MB
const ALERT_THRESHOLD = 80; // percent

/**
 * Parse `used_memory` and `maxmemory` from a Redis INFO memory string.
 * Returns bytes; falls back to Upstash free-tier limit when maxmemory == 0.
 */
function parseRedisMemoryInfo(infoStr: string): {
  usedBytes: number;
  maxBytes: number;
} {
  const usedMatch = infoStr.match(/used_memory:(\d+)/);
  const maxMatch = infoStr.match(/maxmemory:(\d+)/);

  if (!usedMatch) throw new Error("used_memory not found in Redis INFO output");

  const usedBytes = parseInt(usedMatch[1], 10);
  const rawMax = maxMatch ? parseInt(maxMatch[1], 10) : 0;
  const maxBytes = rawMax === 0 ? UPSTASH_FREE_TIER_BYTES : rawMax;

  return { usedBytes, maxBytes };
}

/**
 * Compute usage percentage (0–100).
 */
function usagePercent(usedBytes: number, maxBytes: number): number {
  return (usedBytes / maxBytes) * 100;
}

/**
 * Returns true when usage is at or above the alert threshold.
 */
function shouldAlert(pct: number): boolean {
  return pct >= ALERT_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Redis capacity — memory info parsing", () => {
  it("parses used_memory and maxmemory from INFO output", () => {
    const info = `
# Memory
used_memory:1048576
used_memory_human:1.00M
maxmemory:268435456
maxmemory_human:256.00M
`.trim();

    const { usedBytes, maxBytes } = parseRedisMemoryInfo(info);
    expect(usedBytes).toBe(1_048_576);
    expect(maxBytes).toBe(268_435_456);
  });

  it("falls back to Upstash free-tier limit when maxmemory is 0", () => {
    const info = "used_memory:512000\nmaxmemory:0\n";
    const { maxBytes } = parseRedisMemoryInfo(info);
    expect(maxBytes).toBe(UPSTASH_FREE_TIER_BYTES);
  });

  it("falls back to Upstash free-tier limit when maxmemory is absent", () => {
    const info = "used_memory:512000\n";
    const { maxBytes } = parseRedisMemoryInfo(info);
    expect(maxBytes).toBe(UPSTASH_FREE_TIER_BYTES);
  });

  it("throws when used_memory is absent", () => {
    expect(() => parseRedisMemoryInfo("maxmemory:0\n")).toThrow(
      /used_memory not found/,
    );
  });
});

describe("Redis capacity — usage percentage", () => {
  it("calculates 50% correctly", () => {
    expect(usagePercent(128 * 1024 * 1024, 256 * 1024 * 1024)).toBeCloseTo(
      50,
      5,
    );
  });

  it("calculates 100% when used equals max", () => {
    expect(usagePercent(256 * 1024 * 1024, 256 * 1024 * 1024)).toBeCloseTo(
      100,
      5,
    );
  });
});

describe("Redis capacity — alert threshold", () => {
  it("does not alert below 80%", () => {
    expect(shouldAlert(79.9)).toBe(false);
  });

  it("alerts at exactly 80%", () => {
    expect(shouldAlert(80)).toBe(true);
  });

  it("alerts above 80%", () => {
    expect(shouldAlert(95.5)).toBe(true);
  });
});

describe("Redis capacity — end-to-end scenario", () => {
  it("flags warning when usage exceeds threshold (Upstash free tier)", () => {
    // Simulate ~210 MB used on a Redis instance with no maxmemory cap
    const usedBytes = 210 * 1024 * 1024;
    const info = `used_memory:${usedBytes}\nmaxmemory:0\n`;

    const { usedBytes: parsed, maxBytes } = parseRedisMemoryInfo(info);
    const pct = usagePercent(parsed, maxBytes);

    expect(pct).toBeGreaterThan(80);
    expect(shouldAlert(pct)).toBe(true);
  });

  it("does not flag when usage is well below threshold", () => {
    // Simulate ~50 MB used on a 256 MB cap instance
    const info = `used_memory:${50 * 1024 * 1024}\nmaxmemory:${256 * 1024 * 1024}\n`;

    const { usedBytes, maxBytes } = parseRedisMemoryInfo(info);
    const pct = usagePercent(usedBytes, maxBytes);

    expect(pct).toBeLessThan(80);
    expect(shouldAlert(pct)).toBe(false);
  });
});
