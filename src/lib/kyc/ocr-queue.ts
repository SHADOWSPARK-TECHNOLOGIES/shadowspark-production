import { Queue } from "bullmq";
import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const KYC_OCR_QUEUE = "kyc-ocr";

export interface KycOcrJobData {
  tenantId: string;
  kycDocumentId: string;
  loanApplicationId: string;
  documentUrl?: string | null;
}

let kycOcrQueueInstance: Queue<KycOcrJobData> | null = null;

function getKycOcrQueue(): Queue<KycOcrJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the KYC OCR queue");
  }

  if (!kycOcrQueueInstance) {
    kycOcrQueueInstance = new Queue<KycOcrJobData>(KYC_OCR_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return kycOcrQueueInstance;
}

export async function enqueueKycOcrJob(data: KycOcrJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: KYC_OCR_QUEUE,
    jobName: "kyc.ocr",
    data,
    enqueue: () => getKycOcrQueue().add("kyc.ocr", data),
    runInline: async () => {
      const { processKycDocumentJob } = await import("@/workers/kyc.worker");
      return processKycDocumentJob(data);
    },
  });
}
