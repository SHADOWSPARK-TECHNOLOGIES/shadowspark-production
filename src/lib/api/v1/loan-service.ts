import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { LOAN_STATUSES, isValidLoanTransition } from "@/lib/api/v1/state-machine";
import { prisma } from "@/lib/prisma";

const phoneRegex = /^\+234\d{10}$/;

const amountSchema = z
  .union([z.string().trim().min(1), z.number().finite().transform(String)])
  .transform(String)
  .refine((value) => {
    try {
      const amount = new Prisma.Decimal(value);
      return amount.gt(0) && amount.decimalPlaces() <= 2 && amount.lt("10000000000000");
    } catch {
      return false;
    }
  }, "Amount must be a positive decimal with at most 2 decimal places");

const createLoanSchema = z
  .object({
    applicantName: z.string().trim().min(2).max(200),
    amount: amountSchema.optional(),
    loanAmount: amountSchema.optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .pipe(z.literal("NGN"))
      .default("NGN"),
    purpose: z.string().trim().max(2000).optional(),
    loanPurpose: z.string().trim().max(2000).optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Phone must be in +234XXXXXXXXXX format")
      .optional(),
    applicantPhone: z
      .string()
      .trim()
      .regex(phoneRegex, "Phone must be in +234XXXXXXXXXX format")
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.amount === undefined && value.loanAmount === undefined) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount is required",
      });
    }
    if (value.amount !== undefined && value.loanAmount !== undefined && value.amount !== value.loanAmount) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "amount and loanAmount must match when both are provided",
      });
    }
    if (value.phone === undefined && value.applicantPhone === undefined) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Phone is required",
      });
    }
    if (value.phone !== undefined && value.applicantPhone !== undefined && value.phone !== value.applicantPhone) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "phone and applicantPhone must match when both are provided",
      });
    }
  })
  .transform((value) => {
    const amount = value.amount ?? value.loanAmount;
    const phone = value.phone ?? value.applicantPhone;
    if (amount === undefined || phone === undefined) {
      throw new Error("Validated loan input is missing required normalized fields");
    }

    return {
      applicantName: value.applicantName,
      amount,
      currency: value.currency,
      purpose: value.purpose ?? value.loanPurpose,
      phone,
    };
  });

const patchLoanSchema = z
  .object({
    applicantName: z.string().trim().min(1).optional(),
    applicantPhone: z
      .string()
      .trim()
      .regex(phoneRegex, "Phone must be in +234XXXXXXXXXX format")
      .optional(),
    loanAmount: amountSchema.optional(),
    loanPurpose: z.string().trim().optional(),
    assignedOfficerId: z.string().trim().min(1).optional(),
    status: z.enum(LOAN_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const loansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LOAN_STATUSES).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "loanAmount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/** Canonical, normalized input used to persist a new loan application. */
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type PatchLoanInput = z.infer<typeof patchLoanSchema>;
export type LoansQuery = z.infer<typeof loansQuerySchema>;

/** Validates and normalizes canonical or established loan creation fields. */
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

/** Creates a tenant-scoped Decimal loan and its append-only audit record atomically. */
export async function createLoanApplication(tenantId: string, input: CreateLoanInput, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loanApplication.create({
      data: {
        tenantId,
        applicantName: input.applicantName,
        applicantPhone: input.phone,
        loanAmount: new Prisma.Decimal(input.amount),
        loanPurpose: input.purpose,
        status: "SUBMITTED",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: loan.id,
        actorId,
        action: "LOAN_CREATED",
        metadata: {
          amount: input.amount,
          currency: input.currency,
          applicantPhone: maskPhone(input.phone),
          purpose: input.purpose ?? null,
        },
      },
    });

    return {
      id: loan.id,
      status: "SUBMITTED" as const,
    };
  });
}

function maskPhone(phone: string): string {
  return `***${phone.slice(-4)}`;
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
      const officer = await tx.tenantMembership.findFirst({
        where: { tenantId, userId: patch.assignedOfficerId },
        select: { id: true },
      });
      if (!officer) {
        throw new Error("ASSIGNED_OFFICER_NOT_FOUND");
      }
    }

    const { assignedOfficerId, loanAmount, ...loanPatch } = patch;
    const updateData: Prisma.LoanApplicationUpdateInput = {
      ...loanPatch,
      assignedToId: assignedOfficerId,
      loanAmount: loanAmount === undefined ? undefined : new Prisma.Decimal(loanAmount),
    };

    const updated = await tx.loanApplication.update({
      where: { id: loanId },
      data: updateData,
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
