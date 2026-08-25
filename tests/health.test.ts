import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

const mockRedis = vi.hoisted(() => ({
  ping: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/redis", () => ({ redis: mockRedis }));

import { GET } from "@/app/api/health/route";

describe("health check", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = "redis://test.invalid:6379";
  });

  afterAll(() => {
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
  });

  it("reports connected services", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockResolvedValue("PONG");

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services).toEqual({ database: "connected", redis: "connected" });
  });

  it("reports degraded status when redis is unavailable", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockRejectedValue(new Error("down"));

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services.redis).toBe("disconnected");
  });
});
