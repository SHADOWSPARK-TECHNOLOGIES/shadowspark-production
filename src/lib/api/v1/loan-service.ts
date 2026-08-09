import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { validateLoanTransition } from "@/lib/api/v1/state-machine";

export const createLoanSchema = z.object({
  applicantName: z.string().trim().min(1),
  applicantPhone: z.string().trim().min(7),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().trim().optional(),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export const updateLoanSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "KYC_PENDING", "KYC_VERIFIED", "APPROVED", "REJECTED", "DISBURSED", "CLOSED", "DEFAULTED", "RESTRUCTURED"]),
  assignedToId: z.string().trim().optional(),
});
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

export async function listLoans(tenantId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.loanApplication.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true, tenantId: true, applicantName: true, applicantPhone: true,
        loanAmount: true, loanPurpose: true, status: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.loanApplication.count({ where: { tenantId } }),
  ]);
  return { data: data.map(l => ({ ...l, loanAmount: Number(l.loanAmount) })), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getLoanById(tenantId: string, loanId: string) {
  const loan = await prisma.loanApplication.findFirst({
    where: { id: loanId, tenantId },
    select: {
      id: true, tenantId: true, applicantName: true, applicantPhone: true,
      loanAmount: true, loanPurpose: true, status: true, createdAt: true, updatedAt: true,
    },
  });
  return loan ? { ...loan, loanAmount: Number(loan.loanAmount) } : null;
}

export async function createLoan(tenantId: string, input: CreateLoanInput, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loanApplication.create({
      data: {
        tenantId,
        applicantName: input.applicantName,
        applicantPhone: input.applicantPhone,
        loanAmount: new Prisma.Decimal(input.loanAmount),
        loanPurpose: input.loanPurpose,
        status: "SUBMITTED",
      },
      select: {
        id: true, tenantId: true, applicantName: true, applicantPhone: true,
        loanAmount: true, loanPurpose: true, status: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: loan.id,
        action: "LOAN_CREATED",
        actorId,
        metadata: { applicantPhone: maskPhone(input.applicantPhone), amount: input.loanAmount },
      },
    });

    return { ...loan, loanAmount: Number(loan.loanAmount) };
  });
}

export async function updateLoan(
  tenantId: string,
  loanId: string,
  input: UpdateLoanInput,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.loanApplication.findFirst({
      where: { id: loanId, tenantId },
    });
    if (!existing) return null;

    validateLoanTransition(existing.status, input.status);

    const updateData: Prisma.LoanApplicationUpdateInput = { status: input.status };
    if (input.assignedToId !== undefined) updateData.assignedToId = input.assignedToId;

    const updated = await tx.loanApplication.update({
      where: { id: loanId },
      data: updateData,
      select: {
        id: true, tenantId: true, applicantName: true, applicantPhone: true,
        loanAmount: true, loanPurpose: true, status: true, assignedToId: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: updated.id,
        action: "LOAN_UPDATED",
        actorId,
        metadata: {
          previousStatus: existing.status,
          newStatus: input.status,
          assignedToId: input.assignedToId,
        },
      },
    });

    return { ...updated, loanAmount: Number(updated.loanAmount) };
  });
}

export async function assignLoan(
  tenantId: string,
  loanId: string,
  assignedToId: string,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.loanApplication.findFirst({
      where: { id: loanId, tenantId },
    });
    if (!existing) return null;

    const updated = await tx.loanApplication.update({
      where: { id: loanId },
      data: { assignedToId },
      select: {
        id: true, tenantId: true, applicantName: true, applicantPhone: true,
        loanAmount: true, loanPurpose: true, status: true, assignedToId: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: updated.id,
        action: "LOAN_ASSIGNED",
        actorId,
        metadata: { assignedToId, previousAssignee: existing.assignedToId },
      },
    });

    return { ...updated, loanAmount: Number(updated.loanAmount) };
  });
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : "***";
}
