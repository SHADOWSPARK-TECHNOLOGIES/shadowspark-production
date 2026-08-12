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
    set: vi.fn(async (key: string, value: string, _mode: string, _ttl: number, condition: string) => {
      if (condition === "NX" && idempotencyStore.has(key)) return null;
      idempotencyStore.set(key, value);
      return "OK";
    }),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      idempotencyStore.set(key, value);
      return "OK";
    }),
    eval: vi.fn(async (_script: string, _numberOfKeys: number, key: string, owner: string) => {
      if (idempotencyStore.get(key) !== owner) return 0;
      idempotencyStore.delete(key);
      return 1;
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
        status: "SUBMITTED",
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
          amount: "1000.00",
          phone: "+2348012345678",
        }),
      });

    const first = await POST(request());
    const firstBody = (await first.json()) as { success: true; data: { id: string } };
    const second = await POST(request());
    const secondBody = (await second.json()) as { success: true; data: { id: string } };

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(firstBody.data.id).toBe("loan-1");
    expect(secondBody.data.id).toBe("loan-1");
    expect(mockLoanService.createLoanApplication).toHaveBeenCalledTimes(1);
    expect(mockLoanService.createLoanApplication).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        applicantName: "Ada",
        amount: "1000.00",
        phone: "+2348012345678",
      }),
      "user-1"
    );
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
          amount: "1000.00",
          phone: "+2348012345678",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "MISSING_IDEMPOTENCY_KEY" },
    });
  });

  it("rejects an oversized idempotency key before creating a loan", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
          "Idempotency-Key": "x".repeat(201),
        },
        body: JSON.stringify({
          applicantName: "Ada",
          amount: "1000.00",
          phone: "+2348012345678",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_IDEMPOTENCY_KEY" },
    });
    expect(mockLoanService.createLoanApplication).not.toHaveBeenCalled();
  });

  it("prevents concurrent requests with the same idempotency key", async () => {
    let releaseCreation: (() => void) | undefined;
    mockLoanService.createLoanApplication.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseCreation = () => resolve({ id: "loan-concurrent", status: "SUBMITTED" });
        })
    );

    const request = () =>
      new Request("http://localhost/api/v1/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
          "Idempotency-Key": "concurrent-1",
        },
        body: JSON.stringify({ applicantName: "Ada", amount: "1000.00", phone: "+2348012345678" }),
      });

    const firstPromise = POST(request());
    await vi.waitFor(() => expect(mockLoanService.createLoanApplication).toHaveBeenCalledTimes(1));
    const second = await POST(request());

    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toMatchObject({
      success: false,
      error: { code: "IDEMPOTENCY_IN_PROGRESS" },
    });

    releaseCreation?.();
    const first = await firstPromise;
    expect(first.status).toBe(201);
    expect(mockLoanService.createLoanApplication).toHaveBeenCalledTimes(1);
  });
});
