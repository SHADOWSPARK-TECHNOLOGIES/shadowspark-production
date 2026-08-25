import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  loanApplication: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  kycDocument: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  kycVerificationHistory: {
    findFirst: vi.fn(),
  },
  message: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  repayment: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

const mockQueues = vi.hoisted(() => ({
  enqueueWorkflowTrigger: vi.fn(),
  enqueueMessageSend: vi.fn(),
  enqueueKycOcrJob: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));
vi.mock("@/lib/workflows/queue", () => ({ enqueueWorkflowTrigger: mockQueues.enqueueWorkflowTrigger }));
vi.mock("@/lib/messages/send-queue", () => ({ enqueueMessageSend: mockQueues.enqueueMessageSend }));
vi.mock("@/lib/kyc/ocr-queue", () => ({ enqueueKycOcrJob: mockQueues.enqueueKycOcrJob }));

import { validateLoansQuery } from "@/lib/api/v1/loan-service";
import { sendMessage, validateSendMessageInput } from "@/lib/api/v1/message-service";
import { getKycDocumentById, queueKycOcr, validateKycId } from "@/lib/api/v1/kyc-service";

describe("loan query validation", () => {
  it("accepts sort params", () => {
    const query = validateLoansQuery(
      new URLSearchParams({
        sortBy: "loanAmount",
        sortOrder: "asc",
      })
    );

    expect(query.sortBy).toBe("loanAmount");
    expect(query.sortOrder).toBe("asc");
  });
});

describe("message sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders template variables and queues a message", async () => {
    mockPrisma.loanApplication.findFirst.mockResolvedValue({ id: "loan-1" });
    mockPrisma.message.create.mockResolvedValue({ id: "msg-1" });
    mockQueues.enqueueMessageSend.mockResolvedValue({ id: "job-1" });

    const input = validateSendMessageInput({
      channel: "WHATSAPP",
      to: "+2348012345678",
      body: "Hello {{name}}",
      loanApplicationId: "loan-1",
      variables: { name: "Ada" },
    });

    const result = await sendMessage("tenant-1", "user-1", input);

    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Hello Ada",
          status: "QUEUED",
        }),
      })
    );
    expect(result.jobId).toBe("job-1");
  });
});

describe("kyc helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns derived fields for KYC docs", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      type: "ID_DOCUMENT",
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      fileUrl: "https://example.com/doc.jpg",
      fileHash: null,
      ocrData: { name: "Ada" },
      createdAt: new Date(),
      updatedAt: new Date(),
      loanApplication: {
        id: "loan-1",
        applicantName: "Ada",
        applicantPhone: "+2348012345678",
        loanAmount: 1000,
      },
    });
    mockPrisma.kycVerificationHistory.findFirst.mockResolvedValue({
      status: "VERIFIED",
      actorId: "user-1",
      rejectionReason: null,
      createdAt: new Date(),
    });

    const doc = await getKycDocumentById("kyc-1", "tenant-1");

    expect(doc?.ocrData).toEqual({ name: "Ada" });
    expect(doc?.verificationResponse).toEqual(
      expect.objectContaining({ status: "VERIFIED", actorId: "user-1" })
    );
    expect(validateKycId("kyc-1")).toBe("kyc-1");
  });

  it("queues OCR jobs", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      fileUrl: "https://example.com/doc.jpg",
    });
    mockQueues.enqueueKycOcrJob.mockResolvedValue({ id: "job-ocr" });

    const job = await queueKycOcr("kyc-1", "tenant-1");
    expect(job.id).toBe("job-ocr");
  });
});
