import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({
  verifyAuthToken: vi.fn(),
  signAuthToken: vi.fn(),
}));

import { requireAuthContext } from "@/lib/api/auth-context";
import { verifyAuthToken } from "@/lib/auth";

describe("tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAuthToken).mockResolvedValue({
      sub: "user-a",
      tenantId: "tenant-a",
      role: "ADMIN",
      email: "user-a@example.com",
    });
  });

  it("rejects a mismatched tenant slug hint", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: "tenant-a", companyName: null });

    const result = await requireAuthContext(
      new Request("http://localhost/api/v1/loans/loan-b", {
        headers: {
          Authorization: "Bearer token",
          "x-tenant-slug": "tenant-b",
        },
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code: "TENANT_MISMATCH" },
      });
    }
  });

  it("accepts a matching tenant slug hint", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: "tenant-a", companyName: null });

    const result = await requireAuthContext(
      new Request("http://localhost/api/v1/loans/loan-a", {
        headers: {
          Authorization: "Bearer token",
          "x-tenant-slug": "tenant-a",
        },
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenantId).toBe("tenant-a");
    }
  });
});
