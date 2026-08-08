import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
  },
}));

const mockLoanService = vi.hoisted(() => ({
  createLoanApplication: vi.fn(),
  validateCreateLoanInput: vi.fn(),
  listLoanApplications: vi.fn(),
  validateLoansQuery: vi.fn(),
}));

const idempotencyStore = new Map<string, string>();

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(async (key: string) => idempotencyStore.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      idempotencyStore.set(key, value);
      return "OK";
    }),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api/auth-context", () => ({
  requireAuthContext: vi.fn(async () => ({
    ok: true as const,
    context: {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      email: "admin@example.com",
    },
  })),
}));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: vi.fn(async (_tenantId: string, handler: () => Promise<unknown>) => handler()),
}));
vi.mock("@/lib/api/v1/loan-service", () => mockLoanService);
vi.mock("@/lib/cors", () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: vi.fn(),
}));

import { POST } from "@/app/api/v1/loans/route";

describe("loan idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idempotencyStore.clear();
    let createCount = 0;
    mockLoanService.validateCreateLoanInput.mockImplementation((payload: unknown) => payload);
    mockLoanService.createLoanApplication.mockImplementation(async () => {
      createCount += 1;
      return {
        id: `loan-${createCount}`,
        applicantName: "Ada",
      };
    });
  });

  it("returns the cached loan for a duplicate idempotency key", async () => {
    const request = () =>
      new Request("http://localhost/api/v1/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
          "Idempotency-Key": "test-1",
        },
        body: JSON.stringify({
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
          loanAmount: 1000,
        }),
      });

    const first = await POST(request());
    const firstBody = (await first.json()) as { id: string };
    const second = await POST(request());
    const secondBody = (await second.json()) as { id: string };

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(firstBody.id).toBe("loan-1");
    expect(secondBody.id).toBe("loan-1");
    expect(mockLoanService.createLoanApplication).toHaveBeenCalledTimes(1);
  });

  it("rejects mutation requests without an idempotency key", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
          loanAmount: 1000,
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "MISSING_IDEMPOTENCY_KEY" },
    });
  });
});
