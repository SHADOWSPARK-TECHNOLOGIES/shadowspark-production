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
  kycOcrJob: {
    create: vi.fn(),
  },
  message: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const mockQueues = vi.hoisted(() => ({
  enqueueMessage: vi.fn(),
  enqueueKycOcr: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));
vi.mock("@/lib/messages/queue", () => ({
  enqueueMessage: mockQueues.enqueueMessage,
}));
vi.mock("@/lib/kyc/queue", () => ({ enqueueKycOcr: mockQueues.enqueueKycOcr }));

import { sendMessage, sendMessageSchema } from "@/lib/api/v1/message-service";
import { getKycDocumentById, queueKycOcrJob } from "@/lib/api/v1/kyc-service";

describe("message sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues an outbound message", async () => {
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      channel: "whatsapp",
      direction: "OUTBOUND",
      status: "QUEUED",
      content: "Hello Ada",
      senderId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const input = sendMessageSchema.parse({
      channel: "whatsapp",
      content: "Hello Ada",
      loanApplicationId: "loan-1",
    });

    const result = await sendMessage("tenant-1", input, "user-1");

    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Hello Ada",
          status: "QUEUED",
        }),
      }),
    );
    expect(result.status).toBe("QUEUED");
    expect(mockQueues.enqueueMessage).toHaveBeenCalledWith("tenant-1", "msg-1");
  });
});

describe("kyc helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns masked KYC doc fields", async () => {
    mockPrisma.kycDocument.findFirst.mockResolvedValue({
      id: "kyc-1",
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      type: "ID_DOCUMENT",
      status: "PENDING",
      fileUrl: "https://example.com/doc.jpg",
      fileHash: null,
      ocrData: { name: "Ada" },
      reviewedById: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      loanApplication: {
        id: "loan-1",
        applicantName: "Ada",
        applicantPhone: "+2348012345678",
        loanAmount: 1000,
        status: "KYC_PENDING",
      },
    });

    const doc = await getKycDocumentById("tenant-1", "kyc-1");

    expect(doc?.ocrData).toEqual({ name: "Ada" });
    expect(doc?.loanApplication?.applicantPhone).toBe("***5678");
  });

  it("queues OCR jobs", async () => {
    mockPrisma.kycOcrJob.create.mockResolvedValue({
      id: "job-ocr",
      tenantId: "tenant-1",
      kycDocumentId: "kyc-1",
      status: "PENDING",
      createdAt: new Date(),
    });

    const job = await queueKycOcrJob("tenant-1", "kyc-1");
    expect(job.id).toBe("job-ocr");
    expect(mockQueues.enqueueKycOcr).toHaveBeenCalledWith("tenant-1", "kyc-1");
  });
});
