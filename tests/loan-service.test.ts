import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findFirst: vi.fn(),
  },
  tenantMembership: {
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
  createLoanApplication,
  patchLoanApplication,
  validateCreateLoanInput,
  validatePatchLoanInput,
} from "@/lib/api/v1/loan-service";

describe("loan service validators", () => {
  it("accepts a valid create loan payload", () => {
    expect(
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        amount: "250000.00",
        currency: "ngn",
        phone: "+2348012345678",
      })
    ).toMatchObject({
      applicantName: "Ada Okafor",
      amount: "250000.00",
      currency: "NGN",
      phone: "+2348012345678",
    });
  });

  it("normalizes the established loan payload without floating-point persistence", () => {
    expect(
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        applicantPhone: "+2348012345678",
        loanAmount: 250000,
        loanPurpose: "Working capital",
      })
    ).toMatchObject({
      applicantName: "Ada Okafor",
      amount: "250000",
      currency: "NGN",
      phone: "+2348012345678",
      purpose: "Working capital",
    });
  });

  it("rejects non +234 phone numbers", () => {
    expect(() =>
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        amount: "250000",
        phone: "08012345678",
      })
    ).toThrow(/Phone must be in \+234XXXXXXXXXX format/);
  });

  it("rejects a currency that cannot be represented by the loan schema", () => {
    expect(() =>
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        amount: "250000",
        currency: "USD",
        phone: "+2348012345678",
      })
    ).toThrow();
  });

  it("requires at least one field for loan updates", () => {
    expect(() => validatePatchLoanInput({})).toThrow(/At least one field is required/);
  });

  it("normalizes patched loan amounts without floating-point persistence", () => {
    expect(validatePatchLoanInput({ loanAmount: "250000.25" })).toMatchObject({
      loanAmount: "250000.25",
    });
  });
});

describe("loan service write operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (handler: (tx: typeof mockPrisma) => unknown) =>
      handler(mockPrisma)
    );
  });

  it("creates a tenant-scoped Decimal loan and append-only audit record", async () => {
    mockPrisma.loanApplication.create.mockResolvedValue({ id: "loan-1" });

    const result = await createLoanApplication(
      "tenant-1",
      validateCreateLoanInput({
        applicantName: "Ada Okafor",
        amount: "250000.25",
        currency: "NGN",
        purpose: "Working capital",
        phone: "+2348012345678",
      }),
      "user-1"
    );

    expect(mockPrisma.loanApplication.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        applicantName: "Ada Okafor",
        applicantPhone: "+2348012345678",
        loanAmount: expect.objectContaining({ toString: expect.any(Function) }),
        loanPurpose: "Working capital",
        status: "SUBMITTED",
      },
    });
    const createCall = mockPrisma.loanApplication.create.mock.calls[0]?.[0];
    expect(createCall?.data.loanAmount.toString()).toBe("250000.25");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        loanApplicationId: "loan-1",
        actorId: "user-1",
        action: "LOAN_CREATED",
        metadata: {
          amount: "250000.25",
          currency: "NGN",
          applicantPhone: "***5678",
          purpose: "Working capital",
        },
      },
    });
    expect(result).toEqual({ id: "loan-1", status: "SUBMITTED" });
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

  it("maps an in-tenant officer assignment to the persisted schema field", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-1",
      tenantId: "tenant-1",
      status: "SUBMITTED",
    });
    mockPrisma.tenantMembership.findFirst.mockResolvedValue({ id: "membership-1" });
    mockPrisma.loanApplication.update.mockResolvedValue({ id: "loan-1" });

    await patchLoanApplication(
      "loan-1",
      { assignedOfficerId: "officer-2" },
      "tenant-1",
      "user-1"
    );

    expect(mockPrisma.tenantMembership.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", userId: "officer-2" },
      select: { id: true },
    });
    expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith({
      where: { id: "loan-1" },
      data: { assignedToId: "officer-2" },
    });
  });

  it("rejects patch fields that are not present in the current database schema", () => {
    expect(() => validatePatchLoanInput({ interestRate: 12 })).toThrow();
  });
});
