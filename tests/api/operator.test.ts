import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    lead: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    demo: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    workflowExecution: {
      create: vi.fn(),
    },
    sniperTarget: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/sniper/orchestrator", () => ({
  fireSniperSequence: vi.fn().mockResolvedValue({ targetId: "target-1", status: "FIRED" }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { PATCH as approveLead } from "@/app/api/operator/approve/route";
import { GET as getOperatorLeads } from "@/app/api/operator/leads/route";
import { POST as fireSniper } from "@/app/api/sniper/fire/route";

describe("Operator & Sniper RBAC & Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("PATCH /api/operator/approve", () => {
    it("fails closed with 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue(null);
      const req = new Request("http://localhost/api/operator/approve", {
        method: "PATCH",
        body: JSON.stringify({ leadId: "lead-1" }),
      });
      const res = await approveLead(req);
      expect(res.status).toBe(401);
    });

    it("fails closed with 401 when role is not admin", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "user" } });
      const req = new Request("http://localhost/api/operator/approve", {
        method: "PATCH",
        body: JSON.stringify({ leadId: "lead-1" }),
      });
      const res = await approveLead(req);
      expect(res.status).toBe(401);
    });

    it("accepts seeded uppercase role ADMIN", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
      mocks.prisma.$transaction.mockResolvedValue([]);
      mocks.prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", status: "APPROVED" });

      const req = new Request("http://localhost/api/operator/approve", {
        method: "PATCH",
        body: JSON.stringify({ leadId: "lead-1" }),
      });
      const res = await approveLead(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("accepts lowercase role admin", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
      mocks.prisma.$transaction.mockResolvedValue([]);
      mocks.prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", status: "APPROVED" });

      const req = new Request("http://localhost/api/operator/approve", {
        method: "PATCH",
        body: JSON.stringify({ leadId: "lead-1" }),
      });
      const res = await approveLead(req);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/operator/leads", () => {
    it("fails mobile request when MOBILE_OPERATOR_KEY is not set", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "");
      const req = new Request("http://localhost/api/operator/leads?format=json", {
        headers: { authorization: "Bearer " },
      });
      const res = await getOperatorLeads(req);
      expect(res.status).toBe(401);
    });

    it("fails mobile request with invalid key", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "secret-operator-key");
      const req = new Request("http://localhost/api/operator/leads?format=json", {
        headers: { authorization: "Bearer wrong-key" },
      });
      const res = await getOperatorLeads(req);
      expect(res.status).toBe(401);
    });

    it("accepts mobile request with valid MOBILE_OPERATOR_KEY", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "secret-operator-key");
      mocks.prisma.lead.findMany.mockResolvedValue([]);

      const req = new Request("http://localhost/api/operator/leads?format=json", {
        headers: { authorization: "Bearer secret-operator-key" },
      });
      const res = await getOperatorLeads(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.leads)).toBe(true);
    });

    it("accepts session request with uppercase ADMIN role and format=json", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
      const req = new Request("http://localhost/api/operator/leads");
      const res = await getOperatorLeads(req);
      // Admin session without format=json returns 400 prompt to use mobile view
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Use format=json");
    });

    it("rejects session request with non-admin role", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "user" } });

      const req = new Request("http://localhost/api/operator/leads");
      const res = await getOperatorLeads(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/sniper/fire", () => {
    it("fails closed when MOBILE_OPERATOR_KEY is unset", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "");
      const req = new Request("http://localhost/api/sniper/fire", {
        method: "POST",
        headers: { authorization: "Bearer " },
        body: JSON.stringify({ targetId: "target-1" }),
      });
      const res = await fireSniper(req);
      expect(res.status).toBe(401);
    });

    it("fails closed when authorization token is wrong", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "valid-key-123");
      const req = new Request("http://localhost/api/sniper/fire", {
        method: "POST",
        headers: { authorization: "Bearer bad-key" },
        body: JSON.stringify({ targetId: "target-1" }),
      });
      const res = await fireSniper(req);
      expect(res.status).toBe(401);
    });

    it("succeeds with valid key and ready target", async () => {
      vi.stubEnv("MOBILE_OPERATOR_KEY", "valid-key-123");
      mocks.prisma.sniperTarget.findUnique.mockResolvedValue({
        id: "target-1",
        domain: "example.com",
        companyName: "Example Inc",
        email: "contact@example.com",
        draftEmail: "Hello Example team",
        status: "draft_ready",
      });
      mocks.prisma.sniperTarget.update.mockResolvedValue({
        id: "target-1",
        status: "fired",
      });

      const req = new Request("http://localhost/api/sniper/fire", {
        method: "POST",
        headers: { authorization: "Bearer valid-key-123" },
        body: JSON.stringify({ targetId: "target-1" }),
      });
      const res = await fireSniper(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
    });
  });
});
