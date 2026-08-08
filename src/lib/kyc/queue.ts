import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const KYC_OCR_QUEUE = "kyc-ocr";

export interface KycOcrJobData {
  tenantId: string;
  kycDocumentId: string;
}

let kycOcrQueue: Queue<KycOcrJobData> | null = null;

function getKycOcrQueue(): Queue<KycOcrJobData> {
  if (!kycOcrQueue) {
    kycOcrQueue = new Queue<KycOcrJobData>(KYC_OCR_QUEUE, { connection: redis });
  }
  return kycOcrQueue;
}

export async function enqueueKycOcr(tenantId: string, kycDocumentId: string): Promise<void> {
  await getKycOcrQueue().add("ocr", { tenantId, kycDocumentId });
}
