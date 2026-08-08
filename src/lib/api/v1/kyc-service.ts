import { prisma } from "@/lib/prisma";

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
      ? { ...d.loanApplication, loanAmount: Number(d.loanApplication.loanAmount) }
      : undefined,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
  }));
}

export async function verifyKycDocument(
  tenantId: string,
  kycId: string,
  status: "VERIFIED" | "REJECTED",
  actorId?: string,
  rejectionReason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.kycDocument.findFirst({ where: { id: kycId, tenantId } });
    if (!doc) return null;

    const updated = await tx.kycDocument.update({
      where: { id: kycId },
      data: { status, reviewedById: actorId, reviewedAt: new Date() },
      select: {
        id: true, tenantId: true, loanApplicationId: true, type: true,
        status: true, fileUrl: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: doc.loanApplicationId,
        action: status === "VERIFIED" ? "KYC_VERIFIED" : "KYC_REJECTED",
        actorId,
        metadata: { kycId, rejectionReason },
      },
    });

    return updated;
  });
}
