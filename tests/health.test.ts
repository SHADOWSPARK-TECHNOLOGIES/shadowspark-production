import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

const mockRedis = vi.hoisted(() => ({
  client: { ping: vi.fn() } as { ping: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/redis", () => ({
  get redis() {
    return mockRedis.client;
  },
}));

import { GET } from "@/app/api/health/route";

describe("health check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.client = { ping: vi.fn() };
  });

  it("reports connected services", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.client?.ping.mockResolvedValue("PONG");

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
    mockRedis.client?.ping.mockRejectedValue(new Error("down"));

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services.redis).toBe("disconnected");
  });

  it("keeps health healthy when optional Redis is not configured", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.client = null;

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.redis).toBe("not_configured");
  });
});
