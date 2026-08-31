import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  kycDocument: {
    findFirst: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  loanApplication: {
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  message: {
    create: vi.fn(),
  },
}));

const mockQueues = vi.hoisted(() => ({
  enqueueKycOcrJob: vi.fn(),
  enqueueWorkflowTrigger: vi.fn(),
  enqueueMessageSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/kyc/ocr-queue", () => ({
  enqueueKycOcrJob: mockQueues.enqueueKycOcrJob,
}));

vi.mock("@/lib/workflows/queue", () => ({
  enqueueWorkflowTrigger: mockQueues.enqueueWorkflowTrigger,
}));

vi.mock("@/lib/messages/send-queue", () => ({
  enqueueMessageSend: mockQueues.enqueueMessageSend,
}));

import { requestMoreKycInfo, verifyKycDocument } from "@/lib/api/v1/kyc-service";

describe("kyc service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (handler: (tx: typeof mockPrisma) => unknown) =>
      handler(mockPrisma)
    );
    mockQueues.enqueueMessageSend.mockResolvedValue({ id: "job-message-1" });
    mockQueues.enqueueWorkflowTrigger.mockResolvedValue({ id: "job-workflow-1" });
  });

  it("verifies document, auto-advances loan, and queues credit check", async () => {
    mockPrisma.kycDocument.findFirst
      .mockResolvedValueOnce({
        id: "kyc-1",
        status: "PENDING",
        metadata: null,
        loanApplicationId: "loan-1",
        loanApplication: {
          id: "loan-1",
          status: "KYC_PENDING",
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
        },
      })
      .mockResolvedValueOnce({
        id: "kyc-1",
        status: "VERIFIED",
        rejectionReason: null,
        verifiedBy: "user-1",
        verifiedAt: new Date(),
        metadata: {},
        loanApplicationId: "loan-1",
        loanApplication: {
          id: "loan-1",
          status: "KYC_VERIFIED",
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
          loanAmount: 1000,
        },
      });
    mockPrisma.kycDocument.update.mockResolvedValue({
      id: "kyc-1",
      status: "VERIFIED",
      rejectionReason: null,
    });
    mockPrisma.kycDocument.count.mockResolvedValue(0);
    mockPrisma.message.create.mockResolvedValue({ id: "message-1" });

    const result = await verifyKycDocument({
      kycId: "kyc-1",
      tenantId: "tenant-1",
      actorUserId: "user-1",
      input: {
        status: "VERIFIED",
      },
    });

    expect(result?.loanStatusUpdated).toBe(true);
    expect(mockPrisma.loanApplication.update).toHaveBeenCalled();
    expect(mockQueues.enqueueWorkflowTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "CREDIT_CHECK" })
    );
    expect(mockQueues.enqueueMessageSend).toHaveBeenCalled();
  });

  it("rejects document and reverts loan to KYC_PENDING", async () => {
    mockPrisma.kycDocument.findFirst
      .mockResolvedValueOnce({
        id: "kyc-2",
        status: "PENDING",
        metadata: null,
        loanApplicationId: "loan-2",
        loanApplication: {
          id: "loan-2",
          status: "KYC_VERIFIED",
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
        },
      })
      .mockResolvedValueOnce({
        id: "kyc-2",
        status: "REJECTED",
        rejectionReason: "Blurry",
        verifiedBy: "user-1",
        verifiedAt: new Date(),
        metadata: {},
        loanApplicationId: "loan-2",
        loanApplication: {
          id: "loan-2",
          status: "KYC_PENDING",
          applicantName: "Ada",
          applicantPhone: "+2348012345678",
          loanAmount: 1000,
        },
      });
    mockPrisma.kycDocument.update.mockResolvedValue({
      id: "kyc-2",
      status: "REJECTED",
      rejectionReason: "Blurry",
    });
    mockPrisma.message.create.mockResolvedValue({ id: "message-2" });

    const result = await verifyKycDocument({
      kycId: "kyc-2",
      tenantId: "tenant-1",
      actorUserId: "user-1",
      input: {
        status: "REJECTED",
        rejectionReason: "Blurry",
      },
    });

    expect(result?.loanStatusUpdated).toBe(true);
    expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "KYC_PENDING" }),
      })
    );
    expect(mockQueues.enqueueWorkflowTrigger).not.toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "CREDIT_CHECK" })
    );
  });

  it("requests more KYC info and queues outbound message", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-3",
      loanApplication: {
        id: "loan-3",
        status: "KYC_VERIFIED",
        applicantPhone: "+2348012345678",
      },
    });
    mockPrisma.message.create.mockResolvedValue({ id: "message-3" });

    const result = await requestMoreKycInfo({
      kycId: "kyc-3",
      tenantId: "tenant-1",
      actorUserId: "user-1",
      input: {
        message: "Please upload a clearer ID image",
        documentTypes: ["ID_DOCUMENT"],
      },
    });

    expect(result).toEqual({ success: true });
    expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "KYC_PENDING" }),
      })
    );
    expect(mockQueues.enqueueMessageSend).toHaveBeenCalled();
  });
});
