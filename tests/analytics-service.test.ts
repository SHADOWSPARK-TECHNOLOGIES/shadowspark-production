import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  loanApplication: {
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  kycDocument: { count: vi.fn() },
  workflow: { count: vi.fn() },
  workflowExecution: { count: vi.fn() },
  message: { count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  getDashboardAnalytics,
  validateDashboardAnalyticsQuery,
} from "@/lib/api/v1/analytics-service";

describe("dashboard analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.loanApplication.aggregate.mockResolvedValue({
      _count: { _all: 4 },
      _sum: { loanAmount: { toString: () => "750000.50" } },
    });
    mockPrisma.loanApplication.groupBy.mockResolvedValue([
      { status: "SUBMITTED", _count: { _all: 2 } },
      { status: "APPROVED", _count: { _all: 1 } },
      { status: "DISBURSED", _count: { _all: 1 } },
    ]);
    mockPrisma.kycDocument.count.mockResolvedValue(3);
    mockPrisma.workflow.count.mockResolvedValue(5);
    mockPrisma.workflowExecution.count.mockResolvedValue(7);
    mockPrisma.message.count.mockResolvedValue(9);
  });

  it("aggregates only the authenticated tenant and preserves Decimal totals", async () => {
    const query = validateDashboardAnalyticsQuery(
      new URLSearchParams({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-12T23:59:59.000Z",
      })
    );

    const result = await getDashboardAnalytics("tenant-1", query);

    expect(mockPrisma.loanApplication.aggregate).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        createdAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
      _count: { _all: true },
      _sum: { loanAmount: true },
    });
    expect(mockPrisma.loanApplication.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: {
        tenantId: "tenant-1",
        createdAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
      _count: { _all: true },
    });
    expect(mockPrisma.kycDocument.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        status: "PENDING",
        createdAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
    });
    expect(mockPrisma.workflow.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        isActive: true,
        createdAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
    });
    expect(mockPrisma.workflowExecution.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        startedAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
    });
    expect(mockPrisma.message.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        createdAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-12T23:59:59.000Z"),
        },
      },
    });
    expect(result).toEqual({
      totalLoans: 4,
      totalLoanAmount: "750000.50",
      loansByStatus: {
        SUBMITTED: 2,
        APPROVED: 1,
        DISBURSED: 1,
      },
      approvedLoans: 2,
      approvalRate: 50,
      pendingKycDocuments: 3,
      activeWorkflows: 5,
      workflowExecutions: 7,
      messages: 9,
    });
  });

  it("rejects a reversed date range", () => {
    expect(() =>
      validateDashboardAnalyticsQuery(
        new URLSearchParams({
          from: "2026-08-12T00:00:00.000Z",
          to: "2026-08-01T00:00:00.000Z",
        })
      )
    ).toThrow(/from must be before or equal to to/);
  });
});
