import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  loanApplication: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  createLoan,
  createLoanSchema,
  updateLoan,
  updateLoanSchema,
} from "@/lib/api/v1/loan-service";

describe("loan service validators", () => {
  it("accepts a valid create loan payload", () => {
    expect(
      createLoanSchema.parse({
        applicantName: "Ada Okafor",
        applicantPhone: "+2348012345678",
        loanAmount: 250000,
      }),
    ).toMatchObject({
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
      loanAmount: 250000,
    });
  });

  it("rejects a loan update with invalid status", () => {
    expect(() => updateLoanSchema.parse({ status: "INVALID" })).toThrow();
  });
});

describe("loan service write operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (handler: (tx: typeof mockPrisma) => unknown) =>
        handler(mockPrisma),
    );
  });

  it("creates a loan and audit log", async () => {
    mockPrisma.loanApplication.create.mockResolvedValue({
      id: "loan-1",
      tenantId: "tenant-1",
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
      loanAmount: { toString: () => "250000" },
      loanPurpose: null,
      status: "SUBMITTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createLoan(
      "tenant-1",
      {
        applicantName: "Ada Okafor",
        applicantPhone: "+2348012345678",
        loanAmount: 250000,
      },
      "user-1",
    );

    expect(result.status).toBe("SUBMITTED");
    expect(result.loanAmount).toBe(250000);
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("rejects status jumps that skip the workflow", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-1",
      tenantId: "tenant-1",
      status: "SUBMITTED",
      loanAmount: { toString: () => "1000" },
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
    });

    await expect(
      updateLoan("tenant-1", "loan-1", { status: "APPROVED" }, "user-1"),
    ).rejects.toThrow(/INVALID_TRANSITION/);
  });
});
