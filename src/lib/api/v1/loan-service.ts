import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const createLoanSchema = z.object({
  applicantName: z.string().trim().min(1),
  applicantPhone: z.string().trim().min(7),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().trim().optional(),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

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
        metadata: { applicantPhone: input.applicantPhone, amount: input.loanAmount },
      },
    });

    return { ...loan, loanAmount: Number(loan.loanAmount) };
  });
}
