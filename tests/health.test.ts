import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
  });

  it("reports connected services", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockResolvedValue("PONG");

    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      status: string;
      llm: string;
      twilioConfigured: boolean;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ok");
    expect(body.llm).toBe("script");
    expect(body.twilioConfigured).toBe(false);
    expect(body.services).toEqual({ database: "connected", redis: "connected" });
  });

  it("reports degraded status when redis is unavailable", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockRejectedValue(new Error("down"));

    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      status: string;
      services: { database: string; redis: string };
    };

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.status).toBe("degraded");
    expect(body.services.redis).toBe("disconnected");
  });
});
