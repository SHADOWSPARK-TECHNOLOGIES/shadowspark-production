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
    expect(body.services).toEqual({ database: "connected", redis: "connected", aiAssist: "unconfigured" });
    expect(typeof (body as any).uptime).toBe("number");
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

  it("reports railway and ignores Netlify platform variables", async () => {
    const previous = {
      NETLIFY: process.env.NETLIFY,
      COMMIT_REF: process.env.COMMIT_REF,
      CONTEXT: process.env.CONTEXT,
      RENDER: process.env.RENDER,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA,
    };

    process.env.NETLIFY = "true";
    process.env.COMMIT_REF = "netlifycommit";
    process.env.CONTEXT = "deploy-preview";
    delete process.env.RENDER;
    process.env.RAILWAY_ENVIRONMENT = "production";
    process.env.RAILWAY_ENVIRONMENT_NAME = "production";
    process.env.RAILWAY_PUBLIC_DOMAIN = "shadowspark.up.railway.app";
    process.env.RAILWAY_GIT_COMMIT_SHA = "abcdef1234567890";

    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockResolvedValue("PONG");

    try {
      const response = await GET();
      const body = (await response.json()) as {
        platform: { provider: string; commit: string; env: string };
      };

      expect(body.platform.provider).toBe("railway");
      expect(body.platform.commit).toBe("abcdef1");
      expect(body.platform.env).toBe("production");
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("does not report a netlify provider when only Netlify variables are present", async () => {
    const previous = {
      NETLIFY: process.env.NETLIFY,
      RENDER: process.env.RENDER,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
      RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
    };

    process.env.NETLIFY = "true";
    delete process.env.RENDER;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_PROJECT_ID;
    delete process.env.RAILWAY_SERVICE_ID;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;

    mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
    mockRedis.ping.mockResolvedValue("PONG");

    try {
      const response = await GET();
      const body = (await response.json()) as { platform: { provider: string } };

      expect(body.platform.provider).toBe("local");
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
