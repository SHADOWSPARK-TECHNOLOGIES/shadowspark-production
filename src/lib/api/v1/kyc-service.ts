import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueKycOcr } from "@/lib/kyc/queue";

export const verifyKycSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().trim().optional(),
  autoRejectLoan: z.boolean().default(false),
});
export type VerifyKycInput = z.infer<typeof verifyKycSchema>;

export const requestInfoSchema = z.object({
  field: z.string().trim().min(1),
  message: z.string().trim().min(1),
});
export type RequestInfoInput = z.infer<typeof requestInfoSchema>;

export async function getPendingKyc(tenantId: string) {
  const docs = await prisma.kycDocument.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, tenantId: true, loanApplicationId: true, type: true,
      status: true, fileUrl: true, fileHash: true, ocrData: true,
      reviewedById: true, reviewedAt: true, createdAt: true, updatedAt: true,
      loanApplication: {
        select: { applicantName: true, applicantPhone: true, loanAmount: true },
      },
    },
  });
  return docs.map(d => ({
    ...d,
    loanApplication: d.loanApplication
      ? {
          ...d.loanApplication,
          loanAmount: Number(d.loanApplication.loanAmount),
          applicantPhone: maskPhone(d.loanApplication.applicantPhone),
        }
      : undefined,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
  }));
}

export async function getKycDocumentById(tenantId: string, kycId: string) {
  const doc = await prisma.kycDocument.findFirst({
    where: { id: kycId, tenantId },
    select: {
      id: true, tenantId: true, loanApplicationId: true, type: true,
      status: true, fileUrl: true, fileHash: true, ocrData: true,
      reviewedById: true, reviewedAt: true, createdAt: true, updatedAt: true,
      loanApplication: {
        select: { id: true, applicantName: true, applicantPhone: true, loanAmount: true, status: true },
      },
    },
  });
  if (!doc) return null;
  return {
    ...doc,
    loanApplication: doc.loanApplication
      ? {
          ...doc.loanApplication,
          loanAmount: Number(doc.loanApplication.loanAmount),
          applicantPhone: maskPhone(doc.loanApplication.applicantPhone),
        }
      : undefined,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
  };
}

export async function verifyKycDocument(
  tenantId: string,
  kycId: string,
  input: VerifyKycInput,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.kycDocument.findFirst({ where: { id: kycId, tenantId } });
    if (!doc) return null;

    const updated = await tx.kycDocument.update({
      where: { id: kycId },
      data: {
        status: input.status,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      select: {
        id: true, tenantId: true, loanApplicationId: true, type: true,
        status: true, fileUrl: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.kycVerificationHistory.create({
      data: {
        tenantId,
        kycDocumentId: kycId,
        loanApplicationId: doc.loanApplicationId,
        status: input.status,
        actorId,
        rejectionReason: input.rejectionReason,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: doc.loanApplicationId,
        action: input.status === "VERIFIED" ? "KYC_VERIFIED" : "KYC_REJECTED",
        actorId,
        metadata: { kycId, type: doc.type, rejectionReason: input.rejectionReason },
      },
    });

    const loan = await tx.loanApplication.findFirst({
      where: { id: doc.loanApplicationId, tenantId },
      include: { kycDocuments: true },
    });

    if (loan) {
      if (input.status === "REJECTED" && input.autoRejectLoan) {
        await tx.loanApplication.update({
          where: { id: loan.id },
          data: { status: "REJECTED" },
        });
        await tx.auditLog.create({
          data: {
            tenantId,
            loanApplicationId: loan.id,
            action: "LOAN_UPDATED",
            actorId,
            metadata: { previousStatus: loan.status, newStatus: "REJECTED", reason: "KYC_REJECTED" },
          },
        });
      } else if (input.status === "VERIFIED") {
        const allDocs = loan.kycDocuments;
        const allVerified = allDocs.length > 0 && allDocs.every(d => d.status === "VERIFIED");
        if (allVerified && loan.status === "KYC_PENDING") {
          await tx.loanApplication.update({
            where: { id: loan.id },
            data: { status: "KYC_VERIFIED" },
          });
          await tx.auditLog.create({
            data: {
              tenantId,
              loanApplicationId: loan.id,
              action: "LOAN_UPDATED",
              actorId,
              metadata: { previousStatus: loan.status, newStatus: "KYC_VERIFIED", reason: "ALL_KYC_VERIFIED" },
            },
          });
        }
      }
    }

    return updated;
  });
}

export async function requestKycInfo(
  tenantId: string,
  kycId: string,
  input: RequestInfoInput,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.kycDocument.findFirst({ where: { id: kycId, tenantId } });
    if (!doc) return null;

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: doc.loanApplicationId,
        action: "KYC_INFO_REQUESTED",
        actorId,
        metadata: { kycId, field: input.field, message: input.message },
      },
    });

    return {
      id: kycId,
      loanApplicationId: doc.loanApplicationId,
      field: input.field,
      message: input.message,
      requestedAt: new Date().toISOString(),
    };
  });
}

export async function queueKycOcrJob(tenantId: string, kycDocumentId: string) {
  const job = await prisma.kycOcrJob.create({
    data: { tenantId, kycDocumentId, status: "PENDING" },
    select: { id: true, tenantId: true, kycDocumentId: true, status: true, createdAt: true },
  });
  await enqueueKycOcr(tenantId, kycDocumentId);
  return job;
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : "***";
}
