import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const globalForRedis = global as unknown as { redis: Redis | undefined };

/**
 * Lazily-initialised Redis client.
 *
 * During `next build` (NEXT_PHASE === "phase-production-build") the client is
 * never instantiated, avoiding ECONNREFUSED errors in CI/build environments
 * where Redis is not available.  Consumers that genuinely need Redis at runtime
 * (BullMQ workers, API routes) will receive the real client when the server
 * starts.
 *
 * The non-null assertion (`!`) is safe because every consumer that imports
 * `redis` only does so at runtime — never during static build — and Redis
 * will be available in deployed environments.
 */
function createRedis(): Redis {
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
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
