import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma, type ExtendedPrismaClient } from "@/lib/prisma";
import { encryptSensitiveValue } from "@/lib/encryption";
import { enqueueLoanDisbursementNotification } from "@/lib/loans/disbursement-queue";
import { enqueueWorkflowTrigger } from "@/lib/workflows/queue";

type LoanStatus = "SUBMITTED" | "KYC_PENDING" | "KYC_VERIFIED" | "APPROVED" | "DISBURSED" | "CLOSED";
type LoanDataClient = Pick<
  ExtendedPrismaClient,
  "kycDocument" | "auditLog" | "user" | "repayment"
>;

const loansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "loanAmount", "applicantName", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const phoneSchema = z.string().trim().regex(/^\+234\d{10}$/, "Phone must be in +234XXXXXXXXXX format");

const createLoanSchema = z.object({
  applicantName: z.string().trim().min(1),
  applicantPhone: phoneSchema,
  applicantEmail: z.string().trim().email().optional(),
  loanAmount: z.coerce.number().positive(),
  loanPurpose: z.string().trim().optional(),
  interestRate: z.coerce.number().positive().max(100).optional(),
  tenureMonths: z.coerce.number().int().positive().max(360).optional(),
  bvn: z.string().trim().regex(/^\d{11}$/, "BVN must be exactly 11 digits").optional(),
});

const patchLoanSchema = z
  .object({
    status: z.enum(["SUBMITTED", "KYC_PENDING", "KYC_VERIFIED", "APPROVED", "DISBURSED"]).optional(),
    assignedOfficerId: z.string().trim().min(1).nullable().optional(),
    interestRate: z.coerce.number().positive().max(100).optional(),
    tenureMonths: z.coerce.number().int().positive().max(360).optional(),
    monthlyRepayment: z.coerce.number().positive().optional(),
    totalRepayable: z.coerce.number().positive().optional(),
    disbursementDate: z.coerce.date().optional(),
    rejectionReason: z.string().trim().min(1).optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

const loanIdSchema = z.object({
  id: z.string().trim().min(1),
});

const allowedStatusTransitions = {
  SUBMITTED: "KYC_PENDING",
  KYC_PENDING: "KYC_VERIFIED",
  KYC_VERIFIED: "APPROVED",
  APPROVED: "DISBURSED",
} as const;

type PatchableLoanStatus = keyof typeof allowedStatusTransitions;

export type LoansQuery = z.infer<typeof loansQuerySchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type PatchLoanInput = z.infer<typeof patchLoanSchema>;

export interface LoansPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LoansListResult<TData> {
  data: TData[];
  pagination: LoansPagination;
}

function maskBvn(value: string | null, bvnLast4: string | null): string | null {
  if (bvnLast4) {
    return `******${bvnLast4}`;
  }

  if (!value) {
    return null;
  }

  const rawDigits = value.replace(/\D/g, "");
  if (rawDigits.length <= 4) {
    return rawDigits;
  }

  return `******${rawDigits.slice(-4)}`;
}

function toAmountFilter(minAmount?: number, maxAmount?: number): Prisma.DecimalFilter | undefined {
  if (minAmount === undefined && maxAmount === undefined) {
    return undefined;
  }

  const amountFilter: Prisma.DecimalFilter = {};
  if (minAmount !== undefined) {
    amountFilter.gte = new Prisma.Decimal(minAmount);
  }
  if (maxAmount !== undefined) {
    amountFilter.lte = new Prisma.Decimal(maxAmount);
  }

  return amountFilter;
}

function toDateFilter(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};
  if (dateFrom) {
    filter.gte = dateFrom;
  }
  if (dateTo) {
    filter.lte = dateTo;
  }

  return filter;
}

function buildLoanWhereInput(query: LoansQuery, tenantId: string): Prisma.LoanApplicationWhereInput {
  const where: Prisma.LoanApplicationWhereInput = {
    tenantId,
    status: query.status || undefined,
    loanAmount: toAmountFilter(query.minAmount, query.maxAmount),
    createdAt: toDateFilter(query.dateFrom, query.dateTo),
  };

  if (query.search) {
    where.OR = [
      { applicantName: { contains: query.search, mode: "insensitive" } },
      { applicantPhone: { contains: query.search, mode: "insensitive" } },
      { applicantEmail: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildLoanOrderBy(query: LoansQuery): Prisma.LoanApplicationOrderByWithRelationInput {
  return {
    [query.sortBy]: query.sortOrder,
  } as Prisma.LoanApplicationOrderByWithRelationInput;
}

function serializeDecimal(value: Prisma.Decimal): string {
  return value.toString();
}

async function createAuditLog(
  tenantId: string,
  loanApplicationId: string,
  action: string,
  actorId: string,
  metadata: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      loanApplicationId,
      action,
      actorId,
      metadata,
    },
  });
}

async function ensureApprovalPreconditions(
  tx: LoanDataClient,
  tenantId: string,
  loanId: string
) {
  const [kycDocumentCount, pendingOrRejectedKycCount, creditCheckPassed] = await Promise.all([
    tx.kycDocument.count({
      where: {
        tenantId,
        loanApplicationId: loanId,
      },
    }),
    tx.kycDocument.count({
      where: {
        tenantId,
        loanApplicationId: loanId,
        status: {
          not: "VERIFIED",
        },
      },
    }),
    tx.auditLog.findFirst({
      where: {
        tenantId,
        loanApplicationId: loanId,
        action: {
          in: ["CREDIT_CHECK_COMPLETED", "CREDIT_CHECK_PASSED"],
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (kycDocumentCount === 0 || pendingOrRejectedKycCount > 0) {
    throw new Error("KYC_NOT_READY_FOR_APPROVAL");
  }

  if (!creditCheckPassed) {
    throw new Error("CREDIT_CHECK_REQUIRED_FOR_APPROVAL");
  }
}

function validateStatusTransition(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (!(currentStatus in allowedStatusTransitions)) {
    return false;
  }

  return allowedStatusTransitions[currentStatus as PatchableLoanStatus] === nextStatus;
}

async function ensureAssignedOfficerBelongsToTenant(
  tx: LoanDataClient,
  tenantId: string,
  officerId: string
) {
  const officer = await tx.user.findFirst({
    where: {
      id: officerId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!officer) {
    throw new Error("ASSIGNED_OFFICER_NOT_FOUND");
  }
}

function getBvnDetails(bvn?: string): { encryptedBvn: string | null; bvnLast4: string | null } {
  if (!bvn) {
    return { encryptedBvn: null, bvnLast4: null };
  }

  const encryptedBvn = encryptSensitiveValue(bvn);
  const bvnLast4 = bvn.slice(-4);
  return { encryptedBvn, bvnLast4 };
}

function addMonths(date: Date, months: number): Date {
  const updated = new Date(date);
  updated.setUTCMonth(updated.getUTCMonth() + months);
  return updated;
}

async function generateRepaymentSchedule(tx: LoanDataClient, params: {
  tenantId: string;
  loanId: string;
  totalAmount: Prisma.Decimal;
  tenureMonths: number;
  monthlyRepayment?: number;
  totalRepayable?: number;
  disbursementDate?: Date;
}) {
  await tx.repayment.deleteMany({
    where: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanId,
    },
  });

  const totalRepayable = params.totalRepayable
    ? new Prisma.Decimal(params.totalRepayable)
    : params.totalAmount;
  const monthlyAmount = params.monthlyRepayment
    ? new Prisma.Decimal(params.monthlyRepayment)
    : totalRepayable.div(new Prisma.Decimal(params.tenureMonths));
  const baseDate = params.disbursementDate ?? new Date();
  const repaymentRows = Array.from({ length: params.tenureMonths }, (_, index) => ({
    tenantId: params.tenantId,
    loanApplicationId: params.loanId,
    amount: monthlyAmount,
    dueDate: addMonths(baseDate, index + 1),
    status: "PENDING",
  }));

  await tx.repayment.createMany({
    data: repaymentRows,
  });
}

export function validateLoansQuery(searchParams: URLSearchParams): LoansQuery {
  return loansQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    minAmount: searchParams.get("minAmount") ?? undefined,
    maxAmount: searchParams.get("maxAmount") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
  });
}

export function validateLoanId(id: string): string {
  return loanIdSchema.parse({ id }).id;
}

export function validateCreateLoanInput(payload: unknown): CreateLoanInput {
  return createLoanSchema.parse(payload);
}

export function validatePatchLoanInput(payload: unknown): PatchLoanInput {
  return patchLoanSchema.parse(payload);
}

export async function listLoanApplications(query: LoansQuery, tenantId: string): Promise<LoansListResult<unknown>> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where = buildLoanWhereInput(query, tenantId);
  const orderBy = buildLoanOrderBy(query);

  const [total, loans] = await Promise.all([
    prisma.loanApplication.count({ where }),
    prisma.loanApplication.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        assignedOfficer: { select: { id: true, name: true } },
        _count: {
          select: {
            kycDocuments: true,
            repayments: true,
          },
        },
      },
    }),
  ]);

  return {
    data: loans.map((loan) => ({
      ...loan,
      bvn: maskBvn(loan.bvn, loan.bvnLast4),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getLoanApplicationById(id: string, tenantId: string) {
  const loan = await prisma.loanApplication.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      kycDocuments: true,
      repayments: {
        orderBy: { dueDate: "asc" },
      },
      assignedOfficer: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!loan) {
    return null;
  }

  return {
    ...loan,
    bvn: maskBvn(loan.bvn, loan.bvnLast4),
  };
}

export async function createLoanApplication(
  input: CreateLoanInput,
  tenantId: string,
  actorUserId: string
) {
  const { encryptedBvn, bvnLast4 } = getBvnDetails(input.bvn);

  const createdLoan = await prisma.loanApplication.create({
    data: {
      tenantId,
      applicantName: input.applicantName,
      applicantPhone: input.applicantPhone,
      applicantEmail: input.applicantEmail,
      loanAmount: new Prisma.Decimal(input.loanAmount),
      loanPurpose: input.loanPurpose,
      interestRate:
        input.interestRate !== undefined ? new Prisma.Decimal(input.interestRate) : undefined,
      tenureMonths: input.tenureMonths,
      bvn: encryptedBvn,
      bvnLast4,
      status: "SUBMITTED",
    },
  });

  await createAuditLog(tenantId, createdLoan.id, "LOAN_CREATED", actorUserId, {
    status: "SUBMITTED",
    loanAmount: serializeDecimal(createdLoan.loanAmount),
  });

  await enqueueWorkflowTrigger({
    tenantId,
    trigger: "LOAN_SUBMITTED",
    entityType: "LoanApplication",
    entityId: createdLoan.id,
    payload: {
      applicantPhone: createdLoan.applicantPhone,
      applicantName: createdLoan.applicantName,
    },
  });

  return {
    ...createdLoan,
    bvn: maskBvn(createdLoan.bvn, createdLoan.bvnLast4),
  };
}

export async function patchLoanApplication(
  loanId: string,
  input: PatchLoanInput,
  tenantId: string,
  actorUserId: string
) {
  const { updatedLoan, statusChanged } = await prisma.$transaction(async (tx) => {
    const currentLoan = await tx.loanApplication.findFirst({
      where: {
        id: loanId,
        tenantId,
      },
    });

    if (!currentLoan) {
      throw new Error("LOAN_NOT_FOUND");
    }

    if (input.status && !validateStatusTransition(currentLoan.status, input.status)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const didStatusChange = input.status !== undefined && input.status !== currentLoan.status;

    if (didStatusChange && input.status === "APPROVED") {
      const effectiveTenure = input.tenureMonths ?? currentLoan.tenureMonths;
      if (!effectiveTenure || effectiveTenure <= 0) {
        throw new Error("TENURE_REQUIRED_FOR_APPROVAL");
      }
      await ensureApprovalPreconditions(tx, tenantId, currentLoan.id);
    }

    const data: Prisma.LoanApplicationUpdateInput = {};
    if (input.status) {
      data.status = input.status;
    }
    if (input.assignedOfficerId !== undefined) {
      if (input.assignedOfficerId) {
        await ensureAssignedOfficerBelongsToTenant(tx, tenantId, input.assignedOfficerId);
        data.assignedOfficer = { connect: { id: input.assignedOfficerId } };
      } else {
        data.assignedOfficer = { disconnect: true };
      }
    }
    if (input.interestRate !== undefined) {
      data.interestRate = new Prisma.Decimal(input.interestRate);
    }
    if (input.tenureMonths !== undefined) {
      data.tenureMonths = input.tenureMonths;
    }
    if (input.rejectionReason !== undefined) {
      data.rejectionReason = input.rejectionReason;
    }

    const nextLoan = await tx.loanApplication.update({
      where: { id: currentLoan.id },
      data,
    });

    if (didStatusChange && input.status === "APPROVED") {
      const effectiveTenure = nextLoan.tenureMonths;
      if (!effectiveTenure || effectiveTenure <= 0) {
        throw new Error("TENURE_REQUIRED_FOR_APPROVAL");
      }

      await generateRepaymentSchedule(tx, {
        tenantId,
        loanId: nextLoan.id,
        totalAmount: nextLoan.loanAmount,
        tenureMonths: effectiveTenure,
        monthlyRepayment: input.monthlyRepayment,
        totalRepayable: input.totalRepayable,
        disbursementDate: input.disbursementDate,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: nextLoan.id,
        action: "LOAN_UPDATED",
        actorId: actorUserId,
        metadata: {
          old: {
            status: currentLoan.status,
            assignedOfficerId: currentLoan.assignedOfficerId,
            interestRate: currentLoan.interestRate?.toString() ?? null,
            tenureMonths: currentLoan.tenureMonths,
            rejectionReason: currentLoan.rejectionReason,
          },
          new: {
            status: nextLoan.status,
            assignedOfficerId: nextLoan.assignedOfficerId,
            interestRate: nextLoan.interestRate?.toString() ?? null,
            tenureMonths: nextLoan.tenureMonths,
            monthlyRepayment: input.monthlyRepayment ?? null,
            totalRepayable: input.totalRepayable ?? null,
            disbursementDate: input.disbursementDate?.toISOString() ?? null,
            rejectionReason: nextLoan.rejectionReason,
          },
        },
      },
    });

    return {
      updatedLoan: nextLoan,
      statusChanged: didStatusChange,
    };
  });

  if (statusChanged && input.status === "DISBURSED") {
    await enqueueLoanDisbursementNotification({
      tenantId,
      loanApplicationId: updatedLoan.id,
      applicantName: updatedLoan.applicantName,
      applicantPhone: updatedLoan.applicantPhone,
      amount: serializeDecimal(updatedLoan.loanAmount),
    });
  }

  return {
    ...updatedLoan,
    bvn: maskBvn(updatedLoan.bvn, updatedLoan.bvnLast4),
  };
}

export async function closeLoanApplication(
  loanId: string,
  tenantId: string,
  actorUserId: string
) {
  const existingLoan = await prisma.loanApplication.findFirst({
    where: {
      id: loanId,
      tenantId,
    },
  });

  if (!existingLoan) {
    throw new Error("LOAN_NOT_FOUND");
  }

  const updatedLoan = await prisma.loanApplication.update({
    where: { id: existingLoan.id },
    data: {
      status: "CLOSED",
    },
  });

  await createAuditLog(tenantId, updatedLoan.id, "LOAN_CLOSED", actorUserId, {
    oldStatus: existingLoan.status,
    newStatus: "CLOSED",
  });

  return {
    ...updatedLoan,
    bvn: maskBvn(updatedLoan.bvn, updatedLoan.bvnLast4),
  };
}
