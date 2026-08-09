import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  kycDocument: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  kycVerificationHistory: {
    create: vi.fn(),
  },
  loanApplication: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const mockQueues = vi.hoisted(() => ({
  enqueueKycOcr: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/kyc/queue", () => ({
  enqueueKycOcr: mockQueues.enqueueKycOcr,
}));

import { requestKycInfo, verifyKycDocument } from "@/lib/api/v1/kyc-service";

describe("kyc service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (handler: (tx: typeof mockPrisma) => unknown) =>
        handler(mockPrisma),
    );
  });

  it("verifies document and advances loan to KYC_VERIFIED", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-1",
      status: "PENDING",
      loanApplicationId: "loan-1",
      type: "ID_DOCUMENT",
    });
    mockPrisma.kycDocument.update.mockResolvedValue({
      id: "kyc-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      type: "ID_DOCUMENT",
      status: "VERIFIED",
      fileUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-1",
      status: "KYC_PENDING",
      kycDocuments: [{ id: "kyc-1", status: "VERIFIED" }],
    });

    const result = await verifyKycDocument(
      "tenant-1",
      "kyc-1",
      { status: "VERIFIED", autoRejectLoan: false },
      "user-1",
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("VERIFIED");
    expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loan-1" },
        data: { status: "KYC_VERIFIED" },
      }),
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "KYC_VERIFIED" }),
      }),
    );
  });

  it("rejects document and auto-rejects loan", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-2",
      status: "PENDING",
      loanApplicationId: "loan-2",
      type: "ID_DOCUMENT",
    });
    mockPrisma.kycDocument.update.mockResolvedValue({
      id: "kyc-2",
      tenantId: "tenant-1",
      loanApplicationId: "loan-2",
      type: "ID_DOCUMENT",
      status: "REJECTED",
      fileUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.loanApplication.findFirst.mockResolvedValue({
      id: "loan-2",
      status: "KYC_PENDING",
      kycDocuments: [{ id: "kyc-2", status: "REJECTED" }],
    });

    const result = await verifyKycDocument(
      "tenant-1",
      "kyc-2",
      {
        status: "REJECTED",
        rejectionReason: "Blurry",
        autoRejectLoan: true,
      },
      "user-1",
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("REJECTED");
    expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loan-2" },
        data: { status: "REJECTED" },
      }),
    );
  });

  it("requests more KYC info and creates audit log", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-3",
      loanApplicationId: "loan-3",
      type: "ID_DOCUMENT",
    });

    const result = await requestKycInfo(
      "tenant-1",
      "kyc-3",
      {
        field: "idDocument",
        message: "Please upload a clearer ID image",
      },
      "user-1",
    );

    expect(result).toEqual({
      id: "kyc-3",
      loanApplicationId: "loan-3",
      field: "idDocument",
      message: "Please upload a clearer ID image",
      requestedAt: expect.any(String),
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "KYC_INFO_REQUESTED" }),
      }),
    );
  });
});
