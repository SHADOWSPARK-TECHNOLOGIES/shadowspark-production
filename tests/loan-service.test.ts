import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findFirst: vi.fn(),
  },
  loanApplication: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  repayment: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  kycDocument: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/loans/disbursement-queue", () => ({
  enqueueLoanDisbursementNotification: vi.fn(),
}));

import {
  patchLoanApplication,
  validateCreateLoanInput,
  validatePatchLoanInput,
} from "@/lib/api/v1/loan-service";

describe("loan service validators", () => {
  it("accepts a valid create loan payload", () => {
    expect(
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        applicantPhone: "+2348012345678",
        loanAmount: 250000,
      })
    ).toMatchObject({
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
      loanAmount: 250000,
    });
  });

  it("rejects non +234 phone numbers", () => {
    expect(() =>
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        applicantPhone: "08012345678",
        loanAmount: 250000,
      })
    ).toThrow(/Phone must be in \+234XXXXXXXXXX format/);
  });

  it("requires at least one field for loan updates", () => {
    expect(() => validatePatchLoanInput({})).toThrow(/At least one field is required/);
  });
});

describe("loan service write operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (handler: (tx: typeof mockPrisma) => unknown) =>
      handler(mockPrisma)
    );
  });

  it("rejects status jumps that skip the workflow", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-1",
      tenantId: "tenant-1",
      status: "SUBMITTED",
      assignedOfficerId: null,
      interestRate: null,
      tenureMonths: null,
      rejectionReason: null,
      loanAmount: { toString: () => "1000" },
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
      bvn: null,
      bvnLast4: null,
    });

    await expect(
      patchLoanApplication("loan-1", { status: "APPROVED" }, "tenant-1", "user-1")
    ).rejects.toThrow(/INVALID_STATUS_TRANSITION/);
  });

  it("rejects assigning an officer from another tenant", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-1",
      tenantId: "tenant-1",
      status: "SUBMITTED",
      assignedOfficerId: null,
      interestRate: null,
      tenureMonths: null,
      rejectionReason: null,
      loanAmount: { toString: () => "1000" },
      applicantName: "Ada Okafor",
      applicantPhone: "+2348012345678",
      bvn: null,
      bvnLast4: null,
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      patchLoanApplication(
        "loan-1",
        { assignedOfficerId: "officer-2" },
        "tenant-1",
        "user-1"
      )
    ).rejects.toThrow(/ASSIGNED_OFFICER_NOT_FOUND/);
  });
});
