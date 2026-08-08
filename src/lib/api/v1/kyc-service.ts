import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueKycOcrJob } from "@/lib/kyc/ocr-queue";
import { enqueueWorkflowTrigger } from "@/lib/workflows/queue";
import { enqueueMessageSend } from "@/lib/messages/send-queue";

const verifyKycSchema = z
  .object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    rejectionReason: z.string().trim().optional(),
    ocrData: z.record(z.string(), z.unknown()).optional(),
    verifiedBy: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "REJECTED" && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "rejectionReason is required when status is REJECTED",
      });
    }
  });

const pendingKycQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const requestKycInfoSchema = z.object({
  message: z.string().trim().min(1),
  documentTypes: z.array(z.string().trim().min(1)).optional(),
});

export type VerifyKycInput = z.infer<typeof verifyKycSchema>;
export type PendingKycQuery = z.infer<typeof pendingKycQuerySchema>;
export type RequestKycInfoInput = z.infer<typeof requestKycInfoSchema>;
export const kycIdSchema = z.object({
  id: z.string().trim().min(1),
});

export function validateVerifyKycInput(payload: unknown): VerifyKycInput {
  return verifyKycSchema.parse(payload);
}

export function validateKycId(id: string): string {
  return kycIdSchema.parse({ id }).id;
}

export function validatePendingKycQuery(searchParams: URLSearchParams): PendingKycQuery {
  return pendingKycQuerySchema.parse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
}

export function validateRequestKycInfoInput(payload: unknown): RequestKycInfoInput {
  return requestKycInfoSchema.parse(payload);
}

function formatKycNotificationMessage(
  status: "VERIFIED" | "REJECTED",
  rejectionReason: string | null
): string {
  if (status === "VERIFIED") {
    return "Your KYC document has been verified. We are moving your loan to the next review stage.";
  }

  const reasonText = rejectionReason ? ` Reason: ${rejectionReason}.` : "";
  return `Your KYC document was rejected and additional information is required.${reasonText}`;
}

async function enqueueApplicantWhatsAppMessage(params: {
  tenantId: string;
  loanApplicationId: string;
  to: string;
  body: string;
  actorUserId: string;
}) {
  const message = await prisma.message.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      channel: "WHATSAPP",
      status: "QUEUED",
      content: params.body,
      senderId: params.actorUserId,
    },
    select: {
      id: true,
    },
  });

  const job = await enqueueMessageSend({
    tenantId: params.tenantId,
    channel: "WHATSAPP",
    to: params.to,
    body: params.body,
    loanApplicationId: params.loanApplicationId,
    messageId: message.id,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      actorId: params.actorUserId,
      action: "KYC_NOTIFICATION_QUEUED",
      metadata: {
        messageId: message.id,
        jobId: job.id,
        channel: "WHATSAPP",
      },
    },
  });
}

export async function listPendingKycDocuments(tenantId: string, query: PendingKycQuery) {
  return prisma.kycDocument.findMany({
    where: {
      tenantId,
      status: "PENDING",
    },
    include: {
      loanApplication: {
        select: {
          applicantName: true,
          applicantPhone: true,
          loanAmount: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: query.limit,
    skip: query.offset,
  });
}

export async function getKycDocumentById(kycId: string, tenantId: string) {
  const document = await prisma.kycDocument.findFirst({
    where: {
      id: kycId,
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

  if (!document) {
    return null;
  }

  const metadata = (document.metadata as Record<string, unknown> | null | undefined) ?? {};

  return {
    ...document,
    reviewedById: document.verifiedBy,
    reviewedAt: document.verifiedAt,
    ocrData: metadata.ocrData ?? null,
    verificationResponse: metadata.verificationResponse ?? null,
  };
}

export async function verifyKycDocument(params: {
  kycId: string;
  tenantId: string;
  actorUserId: string;
  input: VerifyKycInput;
}) {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const document = await tx.kycDocument.findFirst({
      where: {
        id: params.kycId,
        tenantId: params.tenantId,
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            status: true,
            applicantName: true,
            applicantPhone: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error("KYC_NOT_FOUND");
    }

    const existingMetadata = (document.metadata as Record<string, unknown> | null | undefined) ?? {};
    const nextMetadata: Record<string, unknown> = {
      ...existingMetadata,
      verificationReviewedAt: new Date().toISOString(),
    };
    if (params.input.ocrData) {
      nextMetadata.ocrData = params.input.ocrData;
    }

    const updatedDocument = await tx.kycDocument.update({
      where: { id: document.id },
      data: {
        status: params.input.status,
        rejectionReason: params.input.rejectionReason ?? null,
        verifiedBy: params.actorUserId,
        verifiedAt: new Date(),
        metadata: nextMetadata,
      },
    });

    let nextLoanStatus: string | null = null;
    if (params.input.status === "REJECTED") {
      nextLoanStatus = "KYC_PENDING";
    }

    if (params.input.status === "VERIFIED") {
      const remainingPendingCount = await tx.kycDocument.count({
        where: {
          tenantId: params.tenantId,
          loanApplicationId: document.loanApplicationId,
          status: {
            not: "VERIFIED",
          },
        },
      });

      if (remainingPendingCount === 0) {
        nextLoanStatus = "KYC_VERIFIED";
      }
    }

    if (nextLoanStatus && nextLoanStatus !== document.loanApplication.status) {
      await tx.loanApplication.update({
        where: { id: document.loanApplicationId },
        data: {
          status: nextLoanStatus,
        },
      });
    } else {
      nextLoanStatus = null;
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        loanApplicationId: document.loanApplicationId,
        actorId: params.actorUserId,
        action: "KYC_DOCUMENT_REVIEWED",
        metadata: {
          kycDocumentId: document.id,
          oldStatus: document.status,
          newStatus: updatedDocument.status,
          verifiedBy: params.actorUserId,
          rejectionReason: updatedDocument.rejectionReason,
        },
      },
    });

    if (nextLoanStatus) {
      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          loanApplicationId: document.loanApplicationId,
          actorId: params.actorUserId,
          action: "LOAN_STATUS_AUTO_UPDATED",
          metadata: {
            oldStatus: document.loanApplication.status,
            newStatus: nextLoanStatus,
            reason:
              nextLoanStatus === "KYC_VERIFIED"
                ? "All KYC documents verified"
                : "KYC document rejected",
          },
        },
      });
    }

    const refreshedDocument = await tx.kycDocument.findFirst({
      where: {
        id: document.id,
        tenantId: params.tenantId,
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            applicantName: true,
            applicantPhone: true,
            loanAmount: true,
            status: true,
          },
        },
      },
    });

    return {
      updatedDocument: refreshedDocument,
      loanApplicationId: document.loanApplicationId,
      loanStatusUpdated: nextLoanStatus !== null,
      shouldQueueCreditCheck: nextLoanStatus === "KYC_VERIFIED",
      applicantPhone: document.loanApplication.applicantPhone,
      notificationMessage: formatKycNotificationMessage(
        params.input.status,
        params.input.rejectionReason ?? null
      ),
    };
  });

  if (!transactionResult.updatedDocument) {
    throw new Error("KYC_NOT_FOUND");
  }

  if (transactionResult.shouldQueueCreditCheck) {
    await enqueueWorkflowTrigger({
      tenantId: params.tenantId,
      trigger: "CREDIT_CHECK",
      entityType: "LoanApplication",
      entityId: transactionResult.loanApplicationId,
      payload: {
        loanApplicationId: transactionResult.loanApplicationId,
      },
    });
  }

  await enqueueApplicantWhatsAppMessage({
    tenantId: params.tenantId,
    loanApplicationId: transactionResult.loanApplicationId,
    to: transactionResult.applicantPhone,
    body: transactionResult.notificationMessage,
    actorUserId: params.actorUserId,
  });

  return {
    kycDocument: transactionResult.updatedDocument,
    loanStatusUpdated: transactionResult.loanStatusUpdated,
  };
}

export async function requestMoreKycInfo(params: {
  kycId: string;
  tenantId: string;
  actorUserId: string;
  input: RequestKycInfoInput;
}) {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const document = await tx.kycDocument.findFirst({
      where: {
        id: params.kycId,
        tenantId: params.tenantId,
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

    if (!document) {
      throw new Error("KYC_NOT_FOUND");
    }

    if (document.loanApplication.status !== "KYC_PENDING") {
      await tx.loanApplication.update({
        where: {
          id: document.loanApplication.id,
        },
        data: {
          status: "KYC_PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          loanApplicationId: document.loanApplication.id,
          actorId: params.actorUserId,
          action: "LOAN_STATUS_AUTO_UPDATED",
          metadata: {
            oldStatus: document.loanApplication.status,
            newStatus: "KYC_PENDING",
            reason: "Additional KYC information requested",
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        loanApplicationId: document.loanApplication.id,
        actorId: params.actorUserId,
        action: "KYC_INFO_REQUESTED",
        metadata: {
          kycDocumentId: document.id,
          message: params.input.message,
          documentTypes: params.input.documentTypes ?? [],
        },
      },
    });

    return {
      loanApplicationId: document.loanApplication.id,
      applicantPhone: document.loanApplication.applicantPhone,
    };
  });

  const documentsText =
    params.input.documentTypes && params.input.documentTypes.length > 0
      ? ` Documents requested: ${params.input.documentTypes.join(", ")}.`
      : "";

  await enqueueApplicantWhatsAppMessage({
    tenantId: params.tenantId,
    loanApplicationId: transactionResult.loanApplicationId,
    to: transactionResult.applicantPhone,
    body: `${params.input.message}${documentsText}`,
    actorUserId: params.actorUserId,
  });

  return {
    success: true,
  };
}

export async function queueKycOcr(kycId: string, tenantId: string) {
  const document = await prisma.kycDocument.findFirst({
    where: {
      id: kycId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      loanApplicationId: true,
      documentUrl: true,
    },
  });

  if (!document) {
    throw new Error("KYC_NOT_FOUND");
  }

  const job = await enqueueKycOcrJob({
    tenantId,
    kycDocumentId: document.id,
    loanApplicationId: document.loanApplicationId,
    documentUrl: document.documentUrl,
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      loanApplicationId: document.loanApplicationId,
      action: "KYC_OCR_QUEUED",
      metadata: {
        kycDocumentId: document.id,
        jobId: job.id,
      },
    },
  });

  return job;
}
