/**
 * Shared rate-limit utility using Upstash Redis + @upstash/ratelimit.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const { success, headers } = await rateLimit(request);
 *   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
 *
 * Falls back gracefully (allows request) when Upstash env vars are not set,
 * so local/dev environments are not blocked.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

/** Shared Upstash Redis client — reused across all rate-limit instances. */
const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

/** Per-endpoint rate-limiters (lazily initialised). */
const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, requests: number, window: string): Ratelimit | null {
  if (!upstashRedis) return null;

  if (!limiters.has(prefix)) {
    limiters.set(
      prefix,
      new Ratelimit({
        redis: upstashRedis,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        limiter: Ratelimit.slidingWindow(requests, window as any),
        ephemeralCache: new Map(),
        prefix: `ratelimit:${prefix}`,
      }),
    );
  }
  return limiters.get(prefix)!;
}

/** Extract a stable client identifier from the request (IP or fallback). */
function getClientIp(request: NextRequest | Request): string {
  const headers = "headers" in request ? request.headers : new Headers();
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export interface RateLimitResult {
  success: boolean;
  headers: Record<string, string>;
}

/**
 * Apply rate limiting to a request.
 *
 * @param request  The incoming request (used to extract client IP).
 * @param prefix   A unique prefix per endpoint (e.g. "auth:register-options").
 * @param requests Max requests in the sliding window (default 10).
 * @param window   Sliding window duration string (e.g. "10 s", "1 m").
 */
export async function rateLimit(
  request: NextRequest | Request,
  prefix: string,
  requests = 10,
  window = "10 s",
): Promise<RateLimitResult> {
  const limiter = getLimiter(prefix, requests, window);

  if (!limiter) {
    return { success: true, headers: {} };
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  return {
    success,
    headers: {
      "Retry-After": Math.max(0, Math.ceil((reset - Date.now()) / 1000)).toString(),
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
