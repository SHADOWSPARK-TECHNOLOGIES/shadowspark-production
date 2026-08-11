import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LOAN_STATUSES, isValidLoanTransition } from "@/lib/api/v1/state-machine";

const phoneRegex = /^\+234\d{10}$/;

const createLoanSchema = z.object({
  applicantName: z.string().trim().min(1),
  applicantPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Phone must be in +234XXXXXXXXXX format"),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().trim().optional(),
  bvn: z.string().trim().optional(),
});

const patchLoanSchema = z
  .object({
    applicantName: z.string().trim().min(1).optional(),
    applicantPhone: z
      .string()
      .trim()
      .regex(phoneRegex, "Phone must be in +234XXXXXXXXXX format")
      .optional(),
    loanAmount: z.number().positive().optional(),
    loanPurpose: z.string().trim().optional(),
    assignedOfficerId: z.string().trim().min(1).optional(),
    interestRate: z.number().min(0).max(100).optional(),
    tenureMonths: z.number().int().positive().optional(),
    status: z.enum(LOAN_STATUSES).optional(),
    rejectionReason: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const loansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LOAN_STATUSES).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "loanAmount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type PatchLoanInput = z.infer<typeof patchLoanSchema>;
export type LoansQuery = z.infer<typeof loansQuerySchema>;

export function validateCreateLoanInput(input: unknown): CreateLoanInput {
  return createLoanSchema.parse(input);
}

export function validatePatchLoanInput(input: unknown): PatchLoanInput {
  return patchLoanSchema.parse(input);
}

export function validateLoansQuery(input: URLSearchParams | Record<string, string | null | undefined>): LoansQuery {
  const source =
    input instanceof URLSearchParams
      ? {
          page: input.get("page") ?? undefined,
          pageSize: input.get("pageSize") ?? undefined,
          status: input.get("status") ?? undefined,
          sortBy: input.get("sortBy") ?? undefined,
          sortOrder: input.get("sortOrder") ?? undefined,
        }
      : {
          page: input.page ?? undefined,
          pageSize: input.pageSize ?? undefined,
          status: input.status ?? undefined,
          sortBy: input.sortBy ?? undefined,
          sortOrder: input.sortOrder ?? undefined,
        };

  return loansQuerySchema.parse(source);
}

export interface LoansPageResult {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listLoans(tenantId: string, page = 1, pageSize = 20): Promise<LoansPageResult> {
  const parsed = validateLoansQuery({ page: String(page), pageSize: String(pageSize) });
  const [total, data] = await Promise.all([
    prisma.loanApplication.count({ where: { tenantId } }),
    prisma.loanApplication.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
  ]);

  return {
    data,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
  };
}

export async function getLoanById(tenantId: string, loanId: string) {
  return prisma.loanApplication.findFirst({
    where: {
      id: loanId,
      tenantId,
    },
  });
}

export async function createLoanApplication(tenantId: string, input: CreateLoanInput, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loanApplication.create({
      data: {
        tenantId,
        applicantName: input.applicantName,
        applicantPhone: input.applicantPhone,
        loanAmount: input.loanAmount,
        loanPurpose: input.loanPurpose,
        bvn: input.bvn,
        status: "SUBMITTED",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: loan.id,
        actorId,
        action: "LOAN_CREATED",
      },
    });

    return loan;
  });
}

export async function patchLoanApplication(
  loanId: string,
  input: PatchLoanInput,
  tenantId: string,
  actorId?: string
) {
  const patch = validatePatchLoanInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.loanApplication.findFirst({
      where: {
        id: loanId,
        tenantId,
      },
    });

    if (!existing) {
      throw new Error("LOAN_NOT_FOUND");
    }

    if (patch.status && !isValidLoanTransition(existing.status as (typeof LOAN_STATUSES)[number], patch.status)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    if (patch.assignedOfficerId) {
      const officer = await tx.user.findFirst({
        where: {
          id: patch.assignedOfficerId,
          tenantId,
        },
      });
      if (!officer) {
        throw new Error("ASSIGNED_OFFICER_NOT_FOUND");
      }
    }

    const updated = await tx.loanApplication.update({
      where: { id: loanId },
      data: patch,
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: updated.id,
        actorId,
        action: "LOAN_UPDATED",
        metadata: {
          changedFields: Object.keys(patch),
        },
      },
    });

    return updated;
  });
}
