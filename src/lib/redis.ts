import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL?.trim();

const globalForRedis = global as unknown as { redis: Redis | null | undefined };

/**
 * Creates the configured Redis client without applying a network default.
 *
 * During `next build` (NEXT_PHASE === "phase-production-build") the client is
 * never instantiated, avoiding ECONNREFUSED errors in CI/build environments
 * where Redis is not available.  Consumers that genuinely need Redis at runtime
 * (BullMQ workers, API routes) will receive the real client when the server
 * starts.
 *
 * @param url - Explicit Redis connection URL supplied by `REDIS_URL`.
 * @returns A BullMQ-compatible Redis client or a build-time guard proxy.
 */
function createRedis(url: string): Redis {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    // Return a proxy that throws on any method call, ensuring build-time
    // access is caught early while keeping the exported type `Redis`.
    return new Proxy({} as unknown as Redis, {
      get() {
        throw new Error(
          "Redis is unavailable during next build. " +
          "Ensure the importing module is guarded with `dynamic = 'force-dynamic'` " +
          "or uses dynamic `import()`.",
        );
      },
    });
  }
  return new Redis(url, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });
}

/**
 * Shared optional Redis client.
 *
 * Redis-backed features must branch on `null`. An absent `REDIS_URL` never
 * creates ioredis, preventing implicit localhost connection attempts.
 */
export const redis: Redis | null = redisUrl
  ? (globalForRedis.redis ?? createRedis(redisUrl))
  : null;

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
