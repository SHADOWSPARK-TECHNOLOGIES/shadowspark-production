import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { UpstreamContractSimulator } from "./e2e/upstream-simulator";

const mockDb = {
  tenants: new Map<string, any>(),
  users: new Map<string, any>(),
  memberships: new Map<string, any>(),
  loans: new Map<string, any>(),
  auditLogs: new Map<string, any>(),
  reset() {
    this.tenants.clear();
    this.users.clear();
    this.memberships.clear();
    this.loans.clear();
    this.auditLogs.clear();
  },
};

const mockPrisma = vi.hoisted(() => ({
  tenant: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tenantMembership: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  loanApplication: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const mockSignIn = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockRequireAuthContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/auth", () => ({ signIn: mockSignIn, auth: mockAuth }));
vi.mock("@/lib/api/auth-context", () => ({ requireAuthContext: mockRequireAuthContext }));
vi.mock("@/lib/cors", () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: () => new Response(null, { status: 204 }),
}));

import {
  getTargetInstitutions,
  provisionTrialTenant,
  provisionTrialTenantCore,
} from "@/app/actions/sandbox";
import { POST as provisionRoute, OPTIONS as provisionOptions } from "@/app/api/sandbox/provision/route";
import { POST as annotateRoute } from "@/app/api/compliance/reviews/[briefId]/annotations/route";

const TEST_API_URL = "https://ai-assist.production.internal";
const TEST_TOKEN = "ai-assist-server-token-super-secret";

describe("Milestone M-R2: Sandbox Provisioning & Compliance Telemetry Engine", { timeout: 60000 }, () => {
  const simulator = new UpstreamContractSimulator(TEST_TOKEN, TEST_API_URL);

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.reset();
    simulator.reset();

    vi.stubEnv("AI_ASSIST_API_URL", TEST_API_URL);
    vi.stubEnv("AI_ASSIST_API_TOKEN", TEST_TOKEN);
    vi.stubEnv("AI_ASSIST_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", simulator.handleFetch);

    mockPrisma.tenant.create.mockImplementation(async ({ data }: any) => {
      const id = `clw${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      mockDb.tenants.set(id, record);
      return record;
    });

    mockPrisma.tenant.findUnique.mockImplementation(async ({ where }: any) => {
      return mockDb.tenants.get(where.id) || null;
    });

    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      return mockDb.users.get(where.email) || null;
    });

    mockPrisma.user.create.mockImplementation(async ({ data }: any) => {
      const id = `usr${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), ...data };
      mockDb.users.set(data.email, record);
      return record;
    });

    mockPrisma.user.update.mockImplementation(async ({ where, data }: any) => {
      for (const [email, user] of mockDb.users.entries()) {
        if (user.id === where.id) {
          const updated = { ...user, ...data };
          mockDb.users.set(email, updated);
          return updated;
        }
      }
      return null;
    });

    mockPrisma.tenantMembership.create.mockImplementation(async ({ data }: any) => {
      const id = `mem${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, ...data };
      mockDb.memberships.set(`${data.tenantId}:${data.userId}`, record);
      return record;
    });

    mockPrisma.tenantMembership.findFirst.mockImplementation(async ({ where }: any) => {
      for (const m of mockDb.memberships.values()) {
        if (where.userId && m.userId === where.userId) return m;
      }
      return null;
    });

    mockPrisma.loanApplication.create.mockImplementation(async ({ data }: any) => {
      const id = `app${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      mockDb.loans.set(id, record);
      return record;
    });

    mockPrisma.loanApplication.findMany.mockImplementation(async ({ where }: any) => {
      return Array.from(mockDb.loans.values()).filter((l) => l.tenantId === where.tenantId);
    });

    mockPrisma.auditLog.create.mockImplementation(async ({ data }: any) => {
      const id = `aud${Math.random().toString(36).slice(2, 10)}`;
      const record = { id, createdAt: new Date(), ...data };
      mockDb.auditLogs.set(id, record);
      return record;
    });

    mockPrisma.auditLog.findMany.mockImplementation(async ({ where }: any) => {
      return Array.from(mockDb.auditLogs.values()).filter((a) => a.tenantId === where.tenantId);
    });

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === "function") {
        return callback(mockPrisma);
      }
      return Promise.all(callback);
    });

    mockSignIn.mockResolvedValue({ ok: true });
    mockAuth.mockResolvedValue(null);
    mockRequireAuthContext.mockResolvedValue({
      ok: true,
      context: {
        userId: "test-user-1",
        tenantId: "test-tenant-1",
        role: "COMPLIANCE",
        email: "compliance@demo.shadowspark.ng",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("1. Target Institutions Coverage", () => {
    it("returns all 10 Batch 01 Nigerian target institutions", async () => {
      const presets = await getTargetInstitutions();
      expect(presets).toHaveLength(10);

      const slugs = presets.map((p) => p.slug);
      expect(slugs).toContain("fairmoney");
      expect(slugs).toContain("carbon");
      expect(slugs).toContain("renmoney");
      expect(slugs).toContain("branch");
      expect(slugs).toContain("kuda");
      expect(slugs).toContain("palmpay");
      expect(slugs).toContain("quidax");
      expect(slugs).toContain("busha");
      expect(slugs).toContain("yellowcard");
      expect(slugs).toContain("flitaa");
    });
  });

  describe("2. Instant Trial Tenant Provisioning Engine", () => {
    it("provisions an isolated trial tenant partition in Neon PostgreSQL with atomic transaction", async () => {
      const result = await provisionTrialTenantCore({
        institutionSlug: "fairmoney",
        companyName: "FairMoney Microfinance Bank",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();

      // Tenant validation
      expect(result.tenant.id).toBeDefined();
      expect(result.tenant.name).toMatch(/^trial-fairmoney-[a-z0-9]+$/);
      expect(result.tenant.companyName).toBe("FairMoney Microfinance Bank");

      // User validation
      expect(result.user.id).toBeDefined();
      expect(result.user.role).toBe("COMPLIANCE");
      expect(result.user.email).toContain("fairmoney");

      // Membership authorization validation
      expect(result.membership.tenantId).toBe(result.tenant.id);
      expect(result.membership.userId).toBe(result.user.id);
      expect(result.membership.role).toBe("COMPLIANCE");

      // Audit log validation
      expect(result.auditLog.action).toBe("TRIAL_TENANT_PROVISIONED");
      expect(result.auditLog.tenantId).toBe(result.tenant.id);
      expect(result.auditLog.actorId).toBe(result.user.id);
    });

    it("seeds exactly 3 synthetic loan exceptions using strict Prisma Decimal precision", async () => {
      const result = await provisionTrialTenantCore({
        institutionSlug: "carbon",
      });

      expect(result.loans).toHaveLength(3);

      const [loan1, loan2, loan3] = result.loans;

      // Exception 1: BVN Identity Mismatch
      expect(loan1.applicantName).toBe("Adaeze Okonkwo");
      expect(loan1.applicantPhone).toBe("+2348011223344");
      expect(loan1.loanAmount).toBeInstanceOf(Prisma.Decimal);
      expect(loan1.loanAmount.toFixed(2)).toBe("350000.00");
      expect(loan1.loanAmount.toNumber()).toBe(350000);
      expect(loan1.status).toBe("UNDER_REVIEW");

      // Exception 2: Structuring Velocity
      expect(loan2.applicantName).toBe("Emeka Nwosu");
      expect(loan2.applicantPhone).toBe("+2348022334455");
      expect(loan2.loanAmount).toBeInstanceOf(Prisma.Decimal);
      expect(loan2.loanAmount.toFixed(2)).toBe("1250000.00");
      expect(loan2.loanAmount.toNumber()).toBe(1250000);
      expect(loan2.status).toBe("KYC_PENDING");

      // Exception 3: PEP Screening Flag
      expect(loan3.applicantName).toBe("Babajide Alabi");
      expect(loan3.applicantPhone).toBe("+2348033445566");
      expect(loan3.loanAmount).toBeInstanceOf(Prisma.Decimal);
      expect(loan3.loanAmount.toFixed(2)).toBe("850000.00");
      expect(loan3.loanAmount.toNumber()).toBe(850000);
      expect(loan3.status).toBe("UNDER_REVIEW");

      // All 3 loans must belong strictly to the newly provisioned tenant
      expect(loan1.tenantId).toBe(result.tenant.id);
      expect(loan2.tenantId).toBe(result.tenant.id);
      expect(loan3.tenantId).toBe(result.tenant.id);
    });

    it("seeds upstream AI-ASSIST briefs and pre-populates review queue in pending_review state", async () => {
      const result = await provisionTrialTenantCore({
        institutionSlug: "renmoney",
      });

      // 3 briefs should have been synthesized upstream
      expect(result.briefs).toHaveLength(3);
      expect(result.briefs.every((b) => b.success)).toBe(true);

      // Verify upstream simulator stored the briefs partitioned by tenantId
      const tenantReviews = Array.from(simulator.reviews.values()).filter(
        (r) => r.tenant_id === result.tenant.id
      );
      expect(tenantReviews).toHaveLength(3);
      expect(tenantReviews.every((r) => r.queue_state === "pending_review")).toBe(true);
      expect(tenantReviews.every((r) => r.sor_status_unchanged === true)).toBe(true);
    });

    it("server action triggers automatic sign-in for seamless 1-click launch", async () => {
      const result = await provisionTrialTenant({
        institutionSlug: "kuda",
      });

      expect(result.success).toBe(true);
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: result.credentials.email,
        password: result.credentials.password,
        redirect: false,
      });
      expect(result.redirectUrl).toBe("/dashboard/reviews");
    });

    it("rejects trial provisioning when operator email already exists (prevent unauthenticated account linkage)", async () => {
      // Pre-seed an existing user in mockDb
      mockDb.users.set("existing.officer@bank.ng", {
        id: "usr_existing_123",
        email: "existing.officer@bank.ng",
        name: "Existing Compliance Lead",
        role: "COMPLIANCE",
      });

      await expect(
        provisionTrialTenantCore({
          institutionSlug: "fairmoney",
          operatorEmail: "existing.officer@bank.ng",
        })
      ).rejects.toMatchObject({
        status: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists. Please sign in or use a different email address.",
      });

      // Verify no orphaned tenant or membership was committed
      expect(mockDb.tenants.size).toBe(0);
      expect(mockDb.memberships.size).toBe(0);
    });
  });

  describe("3. API Route POST /api/sandbox/provision", () => {
    it("provisions trial tenant via REST API returning 201 Created", async () => {
      const request = new Request("http://localhost/api/sandbox/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionSlug: "quidax",
          companyName: "Quidax Technologies Ltd",
        }),
      });

      const response = await provisionRoute(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.tenant.name).toMatch(/^trial-quidax-[a-z0-9]+$/);
      expect(json.data.tenant.companyName).toBe("Quidax Technologies Ltd");
      expect(json.data.membership.role).toBe("COMPLIANCE");
      expect(json.data.loans).toHaveLength(3);
      expect(json.data.loans[0].tenantId).toBe(json.data.tenant.id);
      expect(json.data.briefs).toHaveLength(3);
    });

    it("returns 400 Bad Request when JSON body is malformed", async () => {
      const request = new Request("http://localhost/api/sandbox/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-body{",
      });

      const response = await provisionRoute(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error.code).toBe("INVALID_JSON");
    });

    it("returns 409 Conflict with EMAIL_ALREADY_EXISTS when operator email already exists", async () => {
      // Pre-seed existing user
      mockDb.users.set("preexisting@fintech.ng", {
        id: "usr_preexisting_999",
        email: "preexisting@fintech.ng",
        name: "Chief Compliance Officer",
        role: "ADMIN",
      });

      const request = new Request("http://localhost/api/sandbox/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionSlug: "branch",
          companyName: "Branch International Nigeria",
          operatorEmail: "preexisting@fintech.ng",
        }),
      });

      const response = await provisionRoute(request);
      expect(response.status).toBe(409);

      const json = await response.json();
      expect(json.error.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(json.error.message).toContain("An account with this email already exists");
    });

    it("handles preflight OPTIONS request", async () => {
      const request = new Request("http://localhost/api/sandbox/provision", {
        method: "OPTIONS",
      });

      const response = await provisionOptions(request);
      expect(response.status).toBe(204);
    });
  });

  describe("4. Audit Logging on Annotation Submission (SEC Circular 26-1)", () => {
    it("inserts immutable audit log in Neon after successful operator annotation", async () => {
      // First provision a tenant with briefs
      const provision = await provisionTrialTenantCore({
        institutionSlug: "palmpay",
      });

      const brief = provision.briefs[0];
      expect(brief.briefId).toBeDefined();

      // Configure auth context for the provisioned tenant
      mockRequireAuthContext.mockResolvedValue({
        ok: true,
        context: {
          userId: provision.user.id,
          tenantId: provision.tenant.id,
          role: "COMPLIANCE",
          email: provision.user.email,
        },
      });

      const annotationRequest = new Request(
        `http://localhost/api/compliance/reviews/${brief.briefId}/annotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "test-idem-key-001",
          },
          body: JSON.stringify({
            annotation: "Verified customer identity against verified BVN record. Approved under Rule 14.",
          }),
        }
      );

      const response = await annotateRoute(annotationRequest, {
        params: Promise.resolve({ briefId: brief.briefId! }),
      });

      expect(response.status).toBe(200);

      // Verify immutable audit log record created in Neon PostgreSQL
      const auditRecords = mockDb.auditLogs;
      const annotationLog = Array.from(auditRecords.values()).find(
        (a: any) =>
          a.action === "COMPLIANCE_ANNOTATION_SUBMITTED" && a.tenantId === provision.tenant.id
      );

      expect(annotationLog).toBeDefined();
      expect(annotationLog.tenantId).toBe(provision.tenant.id);
      expect(annotationLog.actorId).toBe(provision.user.id);
      expect(annotationLog.metadata).toMatchObject({
        briefId: brief.briefId,
        annotation: "Verified customer identity against verified BVN record. Approved under Rule 14.",
        idempotencyKey: "test-idem-key-001",
      });
      expect(annotationLog.metadata.submittedAt).toBeDefined();
    });
  });

  describe("5. Multi-Tenant Isolation Safeguards", () => {
    it("ensures two distinct trial tenants are strictly isolated in database and upstream", async () => {
      const tenantA = await provisionTrialTenantCore({ institutionSlug: "fairmoney" });
      const tenantB = await provisionTrialTenantCore({ institutionSlug: "carbon" });

      expect(tenantA.tenant.id).not.toBe(tenantB.tenant.id);
      expect(tenantA.user.id).not.toBe(tenantB.user.id);
      expect(tenantA.membership.id).not.toBe(tenantB.membership.id);

      // Verify loans are strictly partitioned
      const loansA = tenantA.loans;
      const loansB = tenantB.loans;
      expect(loansA.every((l) => l.tenantId === tenantA.tenant.id)).toBe(true);
      expect(loansB.every((l) => l.tenantId === tenantB.tenant.id)).toBe(true);
      expect(loansA.some((l) => l.tenantId === tenantB.tenant.id)).toBe(false);

      // Verify upstream reviews are strictly partitioned
      const reviewsA = Array.from(simulator.reviews.values()).filter(
        (r) => r.tenant_id === tenantA.tenant.id
      );
      const reviewsB = Array.from(simulator.reviews.values()).filter(
        (r) => r.tenant_id === tenantB.tenant.id
      );

      expect(reviewsA).toHaveLength(3);
      expect(reviewsB).toHaveLength(3);
      expect(reviewsA.every((r) => r.tenant_id === tenantA.tenant.id)).toBe(true);
      expect(reviewsB.every((r) => r.tenant_id === tenantB.tenant.id)).toBe(true);
    });
  });
});
