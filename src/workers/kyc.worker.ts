import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { KYC_OCR_QUEUE, type KycOcrJobData } from "@/lib/kyc/ocr-queue";

interface OcrResult {
  text: string;
  provider: string;
  confidence: number;
}

async function extractOcrData(documentUrl: string): Promise<OcrResult> {
  const externalEndpoint = process.env.OCR_API_URL?.trim();
  const externalApiKey = process.env.OCR_API_KEY?.trim();

  if (!externalEndpoint || !externalApiKey) {
    return {
      text: "",
      provider: "none",
      confidence: 0,
    };
  }

  const response = await fetch(externalEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${externalApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documentUrl,
    }),
  });

  const payload = (await response.json()) as {
    text?: string;
    confidence?: number;
    provider?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "OCR provider request failed");
  }

  return {
    text: payload.text ?? "",
    provider: payload.provider ?? "external",
    confidence: typeof payload.confidence === "number" ? payload.confidence : 0,
  };
}

export const kycWorker = new Worker<KycOcrJobData>(
  KYC_OCR_QUEUE,
  async (job) => {
    return runWithTenantContext(job.data.tenantId, async () => {
      const kycDocument = await prisma.kycDocument.findFirst({
        where: {
          id: job.data.kycDocumentId,
          tenantId: job.data.tenantId,
        },
        select: {
          id: true,
          tenantId: true,
          status: true,
          ocrData: true,
          loanApplicationId: true,
          fileUrl: true,
        },
      });

      if (!kycDocument) {
        throw new Error("KYC_NOT_FOUND");
      }

      const sourceUrl = job.data.documentUrl ?? kycDocument.fileUrl;
      if (!sourceUrl) {
        throw new Error("KYC_DOCUMENT_URL_NOT_FOUND");
      }

      const ocrResult = await extractOcrData(sourceUrl);
      const existingOcrData =
        (kycDocument.ocrData as Record<string, unknown> | null | undefined) ?? {};

      const updatedDocument = await prisma.kycDocument.update({
        where: {
          id: kycDocument.id,
        },
        data: {
          status: "PENDING",
          ocrData: {
            ...existingOcrData,
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            provider: ocrResult.provider,
            updatedAt: new Date().toISOString(),
          },
        },
        select: {
          id: true,
          loanApplicationId: true,
          status: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: job.data.tenantId,
          loanApplicationId: updatedDocument.loanApplicationId,
          action: "KYC_OCR_PROCESSED",
          metadata: {
            kycDocumentId: updatedDocument.id,
            provider: ocrResult.provider,
            confidence: ocrResult.confidence,
          },
        },
      });

      return {
        kycDocumentId: updatedDocument.id,
      };
    });
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

kycWorker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }

  await runWithTenantContext(job.data.tenantId, async () => {
    const target = await prisma.kycDocument.findFirst({
      where: {
        id: job.data.kycDocumentId,
        tenantId: job.data.tenantId,
      },
      select: {
        id: true,
        loanApplicationId: true,
      },
    });

    if (!target) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        tenantId: job.data.tenantId,
        loanApplicationId: target.loanApplicationId,
        action: "KYC_OCR_FAILED",
        metadata: {
          kycDocumentId: target.id,
          error: error.message,
          attemptsMade: job.attemptsMade,
        },
      },
    });
  });
});
