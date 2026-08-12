import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisModuleMock = vi.hoisted(() => {
  const client = { ping: vi.fn() };
  const constructor = vi.fn(function RedisConstructor(): object {
    return client;
  });

  return { client, constructor };
});

vi.mock("ioredis", () => ({ default: redisModuleMock.constructor }));

describe("optional Redis connection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exports null without constructing ioredis when REDIS_URL is absent", async () => {
    vi.stubEnv("REDIS_URL", "");

    const { redis } = await import("@/lib/redis");

    expect(redis).toBeNull();
    expect(redisModuleMock.constructor).not.toHaveBeenCalled();
  });

  it("constructs the configured Redis client with BullMQ-compatible options", async () => {
    vi.stubEnv("REDIS_URL", "rediss://cache.example.invalid:6380");

    const { redis } = await import("@/lib/redis");

    expect(redis).toBe(redisModuleMock.client);
    expect(redisModuleMock.constructor).toHaveBeenCalledWith(
      "rediss://cache.example.invalid:6380",
      { maxRetriesPerRequest: null },
    );
  });
});
