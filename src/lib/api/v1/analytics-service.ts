import { z } from "zod";

import { prisma } from "@/lib/prisma";

const dashboardAnalyticsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (value) => value.from === undefined || value.to === undefined || value.from <= value.to,
    {
      path: ["from"],
      message: "from must be before or equal to to",
    }
  );

/** Validated date filters for tenant dashboard aggregates. */
export type DashboardAnalyticsQuery = z.infer<typeof dashboardAnalyticsQuerySchema>;

/** Aggregate values returned by the lending operations dashboard. */
export interface DashboardAnalytics {
  totalLoans: number;
  totalLoanAmount: string;
  loansByStatus: Record<string, number>;
  approvedLoans: number;
  approvalRate: number;
  pendingKycDocuments: number;
  activeWorkflows: number;
  workflowExecutions: number;
  messages: number;
}

/**
 * Validates optional ISO date filters from the analytics route.
 *
 * @param searchParams - Request query parameters.
 * @returns Parsed date range with `Date` values.
 * @throws {z.ZodError} When a date is invalid or the range is reversed.
 */
export function validateDashboardAnalyticsQuery(
  searchParams: URLSearchParams
): DashboardAnalyticsQuery {
  return dashboardAnalyticsQuerySchema.parse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
}

function createDateRange(
  query: DashboardAnalyticsQuery
): { gte?: Date; lte?: Date } | undefined {
  if (query.from === undefined && query.to === undefined) {
    return undefined;
  }

  return {
    ...(query.from === undefined ? {} : { gte: query.from }),
    ...(query.to === undefined ? {} : { lte: query.to }),
  };
}

/**
 * Computes dashboard aggregates within the authenticated tenant boundary.
 *
 * Monetary totals are serialized as decimal strings so JSON responses do not
 * introduce binary floating-point rounding.
 *
 * @param tenantId - Tenant identifier derived from the verified JWT.
 * @param query - Validated optional date range.
 * @returns Tenant-scoped loan, KYC, workflow, and messaging aggregates.
 */
export async function getDashboardAnalytics(
  tenantId: string,
  query: DashboardAnalyticsQuery
): Promise<DashboardAnalytics> {
  const createdAt = createDateRange(query);
  const loanWhere = {
    tenantId,
    ...(createdAt === undefined ? {} : { createdAt }),
  };

  const [loanTotals, groupedLoans, pendingKycDocuments, activeWorkflows, workflowExecutions, messages] =
    await Promise.all([
      prisma.loanApplication.aggregate({
        where: loanWhere,
        _count: { _all: true },
        _sum: { loanAmount: true },
      }),
      prisma.loanApplication.groupBy({
        by: ["status"],
        where: loanWhere,
        _count: { _all: true },
      }),
      prisma.kycDocument.count({
        where: {
          tenantId,
          status: "PENDING",
          ...(createdAt === undefined ? {} : { createdAt }),
        },
      }),
      prisma.workflow.count({
        where: {
          tenantId,
          isActive: true,
          ...(createdAt === undefined ? {} : { createdAt }),
        },
      }),
      prisma.workflowExecution.count({
        where: {
          tenantId,
          ...(createdAt === undefined ? {} : { startedAt: createdAt }),
        },
      }),
      prisma.message.count({
        where: {
          tenantId,
          ...(createdAt === undefined ? {} : { createdAt }),
        },
      }),
    ]);

  const loansByStatus = Object.fromEntries(
    groupedLoans.map((group) => [group.status, group._count._all])
  );
  const approvedLoans = ["APPROVED", "DISBURSED", "CLOSED"].reduce(
    (total, status) => total + (loansByStatus[status] ?? 0),
    0
  );
  const totalLoans = loanTotals._count._all;

  return {
    totalLoans,
    totalLoanAmount: loanTotals._sum.loanAmount?.toString() ?? "0",
    loansByStatus,
    approvedLoans,
    approvalRate: totalLoans === 0 ? 0 : Math.round((approvedLoans / totalLoans) * 100),
    pendingKycDocuments,
    activeWorkflows,
    workflowExecutions,
    messages,
  };
}
