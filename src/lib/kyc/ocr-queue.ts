import { Queue } from "bullmq";
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
  return getKycOcrQueue().add("kyc.ocr", data);
}
