import { Queue } from "bullmq";
import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const KYC_OCR_QUEUE = "kyc-ocr";

export interface KycOcrJobData {
  tenantId: string;
  kycDocumentId: string;
}

let kycOcrQueue: Queue<KycOcrJobData> | null = null;

function getKycOcrQueue(): Queue<KycOcrJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the legacy KYC OCR queue");
  }

  if (!kycOcrQueue) {
    kycOcrQueue = new Queue<KycOcrJobData>(KYC_OCR_QUEUE, { connection: redis });
  }
  return kycOcrQueue;
}

export async function enqueueKycOcr(tenantId: string, kycDocumentId: string): Promise<void> {
  const data = { tenantId, kycDocumentId };
  await dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: KYC_OCR_QUEUE,
    jobName: "ocr",
    data,
    enqueue: () => getKycOcrQueue().add("ocr", data),
    runInline: async () => {
      const { processKycOcrJob } = await import("@/workers/kyc-ocr-worker");
      return processKycOcrJob(data);
    },
  });
}
