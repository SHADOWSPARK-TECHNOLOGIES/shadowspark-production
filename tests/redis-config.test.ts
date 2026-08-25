import { afterEach, describe, expect, it, vi } from "vitest";

const redisConstructor = vi.hoisted(() => vi.fn());

vi.mock("ioredis", () => ({
  default: redisConstructor,
}));

describe("Redis configuration", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    vi.resetModules();
    redisConstructor.mockReset();
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    delete (globalThis as { redis?: unknown }).redis;
  });

  it("does not open a localhost connection when REDIS_URL is absent", async () => {
    delete process.env.REDIS_URL;
    delete process.env.NEXT_PHASE;
    delete (globalThis as { redis?: unknown }).redis;

    const { redis } = await import("@/lib/redis");

    expect(redisConstructor).not.toHaveBeenCalled();
    expect(() => redis.get("healthcheck")).toThrow(/REDIS_URL is required/);
  });
});
