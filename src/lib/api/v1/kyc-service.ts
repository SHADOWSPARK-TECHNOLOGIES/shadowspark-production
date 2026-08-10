import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueKycOcrJob } from "@/lib/kyc/ocr-queue";
import { enqueueWorkflowTrigger } from "@/lib/workflows/queue";
import { enqueueMessageSend } from "@/lib/messages/send-queue";

const verifyInputSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().trim().optional(),
  autoRejectLoan: z.boolean().default(false),
});

const requestMoreKycInfoSchema = z.object({
  message: z.string().trim().min(1),
  documentTypes: z.array(z.string().trim().min(1)).min(1),
});

export function validateKycId(kycId: string): string {
  const trimmed = kycId.trim();
  if (trimmed.length === 0) {
    throw new Error("INVALID_KYC_ID");
  }
  return trimmed;
}

export async function getPendingKyc(tenantId: string) {
  return prisma.kycDocument.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKycDocumentById(kycId: string, tenantId: string) {
  const doc = await prisma.kycDocument.findFirst({
    where: {
      id: validateKycId(kycId),
      tenantId,
    },
    include: {
      loanApplication: {
        select: {
          id: true,
          applicantName: true,
          applicantPhone: true,
          loanAmount: true,
        },
      },
    },
  });

  if (!doc) return null;

  const metadata = (doc.metadata as Record<string, unknown> | null | undefined) ?? {};
  return {
    ...doc,
    ocrData: metadata.ocrData ?? null,
    verificationResponse: metadata.verificationResponse ?? null,
  };
}

export async function queueKycOcr(kycId: string, tenantId: string) {
  const doc = await prisma.kycDocument.findFirst({
    where: {
      id: validateKycId(kycId),
      tenantId,
    },
    select: {
      id: true,
      loanApplicationId: true,
      documentUrl: true,
    },
  });

  if (!doc) {
    throw new Error("KYC_NOT_FOUND");
  }

  return enqueueKycOcrJob({
    tenantId,
    kycDocumentId: doc.id,
    loanApplicationId: doc.loanApplicationId,
    documentUrl: doc.documentUrl,
  });
}

type VerifyInput = z.infer<typeof verifyInputSchema>;

function normalizeVerifyArgs(
  a: string | { tenantId: string; kycId: string; actorUserId?: string; input: VerifyInput },
  b?: string,
  c?: VerifyInput | "VERIFIED" | "REJECTED",
  d?: string,
): { tenantId: string; kycId: string; actorUserId?: string; input: VerifyInput } {
  if (typeof a === "object" && a !== null) {
    return {
      tenantId: a.tenantId,
      kycId: a.kycId,
      actorUserId: a.actorUserId,
      input: verifyInputSchema.parse(a.input),
    };
  }

  if (!b) {
    throw new Error("INVALID_VERIFY_KYC_SIGNATURE");
  }

  if (typeof c === "string") {
    return {
      tenantId: a,
      kycId: b,
      actorUserId: undefined,
      input: verifyInputSchema.parse({ status: c, rejectionReason: d }),
    };
  }

  return {
    tenantId: a,
    kycId: b,
    actorUserId: d,
    input: verifyInputSchema.parse(c),
  };
}

export async function verifyKycDocument(
  a: string | { tenantId: string; kycId: string; actorUserId?: string; input: VerifyInput },
  b?: string,
  c?: VerifyInput | "VERIFIED" | "REJECTED",
  d?: string,
) {
  const { tenantId, kycId, actorUserId, input } = normalizeVerifyArgs(a, b, c, d);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.kycDocument.findFirst({
      where: {
        id: validateKycId(kycId),
        tenantId,
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            status: true,
            applicantPhone: true,
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    const existingMetadata =
      (existing.metadata as Record<string, unknown> | null | undefined) ?? {};
    await tx.kycDocument.update({
      where: {
        id: existing.id,
      },
      data: {
        status: input.status,
        rejectionReason: input.status === "REJECTED" ? input.rejectionReason ?? null : null,
        verifiedBy: actorUserId ?? null,
        verifiedAt: new Date(),
        metadata: {
          ...existingMetadata,
          verificationResponse: {
            status: input.status,
            rejectionReason: input.rejectionReason ?? null,
            actorUserId: actorUserId ?? null,
          },
        },
      },
    });

    let loanStatusUpdated = false;

    const loan = await tx.loanApplication.findFirst({
      where: {
        id: existing.loanApplicationId,
        tenantId,
      },
      include: {
        kycDocuments: {
          select: { id: true, status: true },
        },
      },
    });

    if (loan) {
      const statuses = loan.kycDocuments.map((doc) => (doc.id === existing.id ? input.status : doc.status));
      const allVerified = statuses.length > 0 && statuses.every((status) => status === "VERIFIED");

      if (input.status === "VERIFIED" && allVerified && loan.status !== "KYC_VERIFIED") {
        await tx.loanApplication.update({
          where: { id: loan.id },
          data: { status: "KYC_VERIFIED" },
        });
        loanStatusUpdated = true;

        await enqueueWorkflowTrigger({
          tenantId,
          trigger: "CREDIT_CHECK",
          entityType: "LoanApplication",
          entityId: loan.id,
          payload: { loanApplicationId: loan.id, kycDocumentId: existing.id },
        });
      }

      if (input.status === "REJECTED") {
        const shouldRejectLoan = input.autoRejectLoan;
        if (shouldRejectLoan && loan.status !== "REJECTED") {
          await tx.loanApplication.update({
            where: { id: loan.id },
            data: { status: "REJECTED" },
          });
          loanStatusUpdated = true;
        } else if (!shouldRejectLoan && loan.status === "KYC_VERIFIED") {
          await tx.loanApplication.update({
            where: { id: loan.id },
            data: { status: "KYC_PENDING" },
          });
          loanStatusUpdated = true;
        }
      }
    }

    if (existing.loanApplication?.applicantPhone) {
      const message =
        input.status === "VERIFIED"
          ? "Your KYC document has been verified."
          : `Your KYC document was rejected${input.rejectionReason ? `: ${input.rejectionReason}` : "."}`;

      const outbound = await tx.message.create({
        data: {
          tenantId,
          loanApplicationId: existing.loanApplicationId,
          channel: "WHATSAPP",
          status: "QUEUED",
          content: message,
          senderId: actorUserId ?? null,
        },
        select: { id: true },
      });

      await enqueueMessageSend({
        tenantId,
        messageId: outbound.id,
        loanApplicationId: existing.loanApplicationId,
        channel: "WHATSAPP",
        to: existing.loanApplication.applicantPhone,
        body: message,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: existing.loanApplicationId,
        actorId: actorUserId ?? null,
        action: input.status === "VERIFIED" ? "KYC_VERIFIED" : "KYC_REJECTED",
        metadata: {
          kycId: existing.id,
          rejectionReason: input.rejectionReason ?? null,
          loanStatusUpdated,
        },
      },
    });

    return {
      id: existing.id,
      status: input.status,
      loanStatusUpdated,
    };
  });
}

export async function requestMoreKycInfo(params: {
  kycId: string;
  tenantId: string;
  actorUserId?: string;
  input: z.infer<typeof requestMoreKycInfoSchema>;
}) {
  const input = requestMoreKycInfoSchema.parse(params.input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.kycDocument.findFirst({
      where: {
        id: validateKycId(params.kycId),
        tenantId: params.tenantId,
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            applicantPhone: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("KYC_NOT_FOUND");
    }

    await tx.loanApplication.update({
      where: { id: existing.loanApplicationId },
      data: { status: "KYC_PENDING" },
    });

    const outbound = await tx.message.create({
      data: {
        tenantId: params.tenantId,
        loanApplicationId: existing.loanApplicationId,
        channel: "WHATSAPP",
        status: "QUEUED",
        content: input.message,
        senderId: params.actorUserId ?? null,
      },
      select: { id: true },
    });

    if (existing.loanApplication?.applicantPhone) {
      await enqueueMessageSend({
        tenantId: params.tenantId,
        messageId: outbound.id,
        loanApplicationId: existing.loanApplicationId,
        channel: "WHATSAPP",
        to: existing.loanApplication.applicantPhone,
        body: input.message,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        loanApplicationId: existing.loanApplicationId,
        actorId: params.actorUserId ?? null,
        action: "KYC_MORE_INFO_REQUESTED",
        metadata: {
          kycId: existing.id,
          documentTypes: input.documentTypes,
        },
      },
    });

    return { success: true as const };
  });
}
