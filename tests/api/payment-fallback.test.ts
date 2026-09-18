import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    $queryRaw: vi.fn(),
    lead: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
    },
    sniperTarget: {
      update: vi.fn(),
    },
  },
  redis: {
    ping: vi.fn(),
  },
  crawlQueue: {
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
  },
  leadSyncQueue: {
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/redis", () => ({
  redis: mocks.redis,
}));

vi.mock("@/lib/crawl/queue", () => ({
  crawlQueue: mocks.crawlQueue,
}));

vi.mock("@/lib/leads/queue", () => ({
  leadSyncQueue: mocks.leadSyncQueue,
}));

import { POST as initPaystack } from "@/app/api/paystack/initialize/route";
import { POST as initDemoPayment } from "@/app/api/leads/[id]/initialize-demo-payment/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getReady } from "@/app/api/ready/route";
import { POST as publishThreads } from "@/app/api/threads/publish/route";
import { GET as getQueueStats } from "@/app/api/operator/queue-stats/route";
import { POST as discardSniper } from "@/app/api/sniper/discard/route";
import { POST as resendInbound } from "@/app/api/webhooks/resend-inbound/route";
import { NextRequest } from "next/server";

describe("Paystack Fallback & System Hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("Paystack Fallback (P1)", () => {
    it("fails closed with 503 when PAYSTACK_SECRET_KEY is absent in /api/paystack/initialize", async () => {
      delete process.env.PAYSTACK_SECRET_KEY;

      const req = new Request("http://localhost:3000/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", amount: 1500000 }),
      });

      const res = await initPaystack(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.status).toBe(false);
      expect(data.code).toBe("PAYMENT_UNAVAILABLE");
      expect(data.error).toContain("Online checkout is currently unavailable. Contact us to start your pilot.");
      expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
    });

    it("fails closed with 503 when PAYSTACK_SECRET_KEY is a mock value in /api/paystack/initialize", async () => {
      process.env.PAYSTACK_SECRET_KEY = "mock_secret_key";

      const req = new Request("http://localhost:3000/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", amount: 1500000 }),
      });

      const res = await initPaystack(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.code).toBe("PAYMENT_UNAVAILABLE");
      expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
    });

    it("fails closed with 503 when PAYSTACK_SECRET_KEY is absent in /api/leads/[id]/initialize-demo-payment", async () => {
      delete process.env.PAYSTACK_SECRET_KEY;
      mocks.prisma.lead.findUnique.mockResolvedValueOnce({
        id: "lead-123",
        status: "demo_scheduled",
        email: "prospect@example.com",
        demo: { id: "demo-1" },
      });

      const req = new NextRequest("http://localhost:3000/api/leads/lead-123/initialize-demo-payment", {
        method: "POST",
      });

      const res = await initDemoPayment(req, { params: Promise.resolve({ id: "lead-123" }) });
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.code).toBe("PAYMENT_UNAVAILABLE");
      expect(data.error).toContain("Online checkout is currently unavailable. Contact us to start your pilot.");
      expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("Observability: Health & Ready Endpoints (P1)", () => {
    it("GET /api/health includes uptime, latencyMs, services, and platform provider", async () => {
      mocks.prisma.$queryRaw.mockResolvedValue([{ count: 5 }]);
      mocks.redis.ping.mockResolvedValue("PONG");

      const res = await getHealth();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(typeof data.uptime).toBe("number");
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.latencyMs).toBe("number");
      expect(data.services.database).toBe("connected");
      expect(data.services.redis).toBe("connected");
      expect(data.services.aiAssist).toBe("unconfigured");
      expect(["netlify", "render", "local"]).toContain(data.platform.provider);
    });

    it("GET /api/ready returns 200 ready when health check passes", async () => {
      mocks.prisma.$queryRaw.mockResolvedValue([{ count: 1 }]);
      mocks.redis.ping.mockResolvedValue("PONG");

      const res = await getReady();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ready");
      expect(data.ready).toBe(true);
      expect(data.checks.status).toBe("ok");
    });
  });

  describe("Security Hardening Guards (P0/P1)", () => {
    it("POST /api/threads/publish rejects unauthenticated calls with 401", async () => {
      mocks.auth.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello world" }),
      });

      const res = await publishThreads(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/threads/publish rejects non-admin users with 401", async () => {
      mocks.auth.mockResolvedValueOnce({ user: { role: "user" } });

      const req = new Request("http://localhost:3000/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello world" }),
      });

      const res = await publishThreads(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/operator/queue-stats rejects non-admin users with 401", async () => {
      mocks.auth.mockResolvedValueOnce({ user: { role: "user" } });

      const res = await getQueueStats();
      expect(res.status).toBe(401);
    });

    it("POST /api/sniper/discard fails closed when MOBILE_OPERATOR_KEY is unset and client sends Bearer undefined", async () => {
      delete process.env.MOBILE_OPERATOR_KEY;

      const req = new Request("http://localhost:3000/api/sniper/discard", {
        method: "POST",
        headers: {
          authorization: "Bearer undefined",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetId: "tgt-1" }),
      });

      const res = await discardSniper(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/webhooks/resend-inbound fails closed with 503 when secret is unset", async () => {
      delete process.env.RESEND_INBOUND_SECRET;

      const req = new NextRequest("http://localhost:3000/api/webhooks/resend-inbound", {
        method: "POST",
      });

      const res = await resendInbound(req);
      expect(res.status).toBe(503);
    });

    it("POST /api/webhooks/resend-inbound fails closed with 401 when signature is missing or invalid", async () => {
      process.env.RESEND_INBOUND_SECRET = "inbound_secret_123";

      const req = new NextRequest("http://localhost:3000/api/webhooks/resend-inbound", {
        method: "POST",
        headers: {
          "resend-signature": "wrong_signature",
        },
      });

      const res = await resendInbound(req);
      expect(res.status).toBe(401);
    });
  });
});
