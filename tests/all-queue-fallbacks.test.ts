import { beforeEach, describe, expect, it, vi } from "vitest";

const processors = vi.hoisted(() => ({
  crawl: vi.fn().mockResolvedValue({ ok: true }),
  followUp: vi.fn().mockResolvedValue({ success: true }),
  kyc: vi.fn().mockResolvedValue(undefined),
  kycDocument: vi.fn().mockResolvedValue({ kycDocumentId: "kyc-1" }),
  lead: vi.fn().mockResolvedValue({ success: true, leadId: "lead-1", score: 90 }),
  nudge: vi.fn().mockResolvedValue({ sent: true }),
  sniper: vi.fn().mockResolvedValue({ ok: true }),
  workflow: vi.fn().mockResolvedValue({ matched: 1, executed: 1 }),
  disbursement: vi.fn().mockResolvedValue({ sent: true }),
}));

const prismaMocks = vi.hoisted(() => ({
  message: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMocks }));
vi.mock("bullmq", () => ({
  Queue: vi.fn(() => {
    throw new Error("BullMQ Queue must not be constructed without Redis");
  }),
  Worker: vi.fn(() => {
    throw new Error("BullMQ Worker must not be constructed without Redis");
  }),
}));
vi.mock("@/workers/crawl-worker", () => ({ processCrawlJob: processors.crawl }));
vi.mock("@/workers/follow-up-worker", () => ({ processFollowUp: processors.followUp }));
vi.mock("@/workers/kyc-ocr-worker", () => ({ processKycOcrJob: processors.kyc }));
vi.mock("@/workers/kyc.worker", () => ({ processKycDocumentJob: processors.kycDocument }));
vi.mock("@/workers/lead-worker", () => ({ processLeadSyncJob: processors.lead }));
vi.mock("@/workers/nudge-worker", () => ({ processNudgeJob: processors.nudge }));
vi.mock("@/workers/sniper-worker", () => ({ processSniperJob: processors.sniper }));
vi.mock("@/lib/workflows/trigger-processor", () => ({
  processWorkflowTriggerJob: processors.workflow,
}));
vi.mock("@/lib/loans/disbursement-processor", () => ({
  processLoanDisbursementNotification: processors.disbursement,
}));

describe("BullMQ producer fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs every producer's processor inline when Redis is absent", async () => {
    const { enqueueCrawl } = await import("@/lib/crawl/queue");
    const { addLeadToSyncQueue, enqueueFollowUp } = await import("@/lib/leads/queue");
    const { enqueueMessage } = await import("@/lib/messages/queue");
    const { enqueueKycOcr } = await import("@/lib/kyc/queue");
    const { enqueueKycOcrJob } = await import("@/lib/kyc/ocr-queue");
    const { enqueuePaymentNudge } = await import("@/lib/whatsapp/nudge-queue");
    const { enqueueSniperTarget } = await import("@/lib/sniper/queue");
    const { enqueueWorkflowTrigger } = await import("@/lib/workflows/queue");
    const { enqueueLoanDisbursementNotification } = await import(
      "@/lib/loans/disbursement-queue"
    );

    await enqueueCrawl({ rootUrl: "https://example.com" });
    await addLeadToSyncQueue({ phone: "+2348000000000" });
    await enqueueFollowUp("lead-1", 1234);
    await enqueueMessage("tenant-1", "message-1");
    await enqueueKycOcr("tenant-1", "kyc-1");
    await enqueueKycOcrJob({
      tenantId: "tenant-1",
      kycDocumentId: "kyc-1",
      loanApplicationId: "loan-1",
    });
    await enqueuePaymentNudge({
      leadId: "lead-1",
      phoneNumber: "+2348000000000",
      authorizationUrl: "https://example.com/pay",
      accessCode: "access",
      reference: "reference",
      amountKobo: 1000,
      tier: "starter",
    });
    await enqueueSniperTarget({ targetId: "target-1", domain: "https://example.com" });
    await enqueueWorkflowTrigger({
      tenantId: "tenant-1",
      trigger: "MESSAGE_RECEIVED",
      entityType: "Message",
      entityId: "message-1",
    });
    await enqueueLoanDisbursementNotification({
      tenantId: "tenant-1",
      loanApplicationId: "loan-1",
      applicantName: "Ada",
      applicantPhone: "+2348000000000",
      amount: "1000.00",
    });

    expect(processors.crawl).toHaveBeenCalledOnce();
    expect(processors.lead).toHaveBeenCalledOnce();
    expect(processors.followUp).toHaveBeenCalledWith("lead-1");
    expect(prismaMocks.message.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "message-1", tenantId: "tenant-1" } })
    );
    expect(processors.kyc).toHaveBeenCalledOnce();
    expect(processors.kycDocument).toHaveBeenCalledOnce();
    expect(processors.nudge).toHaveBeenCalledOnce();
    expect(processors.sniper).toHaveBeenCalledOnce();
    expect(processors.workflow).toHaveBeenCalledOnce();
    expect(processors.disbursement).toHaveBeenCalledOnce();
  });
});
