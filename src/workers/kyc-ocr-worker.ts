import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { KYC_OCR_QUEUE, type KycOcrJobData } from "@/lib/kyc/queue";

/** Processes one legacy KYC OCR job independently of BullMQ transport. */
export async function processKycOcrJob(data: KycOcrJobData): Promise<void> {
  const pendingJob = await prisma.kycOcrJob.findFirst({
    where: { tenantId: data.tenantId, kycDocumentId: data.kycDocumentId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!pendingJob) return;

  await prisma.kycOcrJob.update({
    where: { id: pendingJob.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // Simulate OCR processing. In production this would call an OCR provider.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const result = { confidence: 0.97, extractedId: `DOC-${Date.now()}` };

    await prisma.kycOcrJob.update({
      where: { id: pendingJob.id },
      data: { status: "COMPLETED", result, completedAt: new Date() },
    });

    await prisma.kycDocument.update({
      where: { id: data.kycDocumentId },
      data: { ocrData: result },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    await prisma.kycOcrJob.update({
      where: { id: pendingJob.id },
      data: { status: "FAILED", error: message, completedAt: new Date() },
    });
  }
}

export function startKycOcrWorker(): Worker<KycOcrJobData> | null {
  if (redis === null) return null;

  return new Worker<KycOcrJobData>(
    KYC_OCR_QUEUE,
    async (job) => {
      await processKycOcrJob(job.data);
    },
    { connection: redis },
  );
}

const worker = startKycOcrWorker();
worker?.on("completed", (job) => console.log(`[kyc-ocr-worker] completed ${job.id}`));
worker?.on("failed", (job, err) => console.error(`[kyc-ocr-worker] failed ${job?.id}:`, err));
if (worker) console.log("[kyc-ocr-worker] started");
