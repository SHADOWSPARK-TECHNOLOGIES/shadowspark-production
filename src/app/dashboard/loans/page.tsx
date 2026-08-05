import { prisma } from "@/lib/prisma";
import { LoanTable } from "@/components/dashboard/loans/LoanTable";
import Link from "next/link";

interface SearchParams {
  status?: string;
  q?: string;
}

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const statusFilter = params.status?.toUpperCase();
  const query = params.q?.trim();

  const loans = await prisma.loanApplication.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { applicantName: { contains: query, mode: "insensitive" } },
              { phoneNumber: { contains: query } },
              { purpose: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      kycRecord: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const loanRows = loans.map((l) => ({
    ...l,
    kycStatus: l.kycRecord?.status,
  }));

  const statuses = ["PENDING", "UNDER_REVIEW", "KYC_REQUIRED", "APPROVED", "REJECTED", "DISBURSED", "DEFAULTED"];

  return (
    <>
      <div className="card-header">
        <div>
          <h2 className="card-title">Loan Applications</h2>
          <p className="card-sub">
            {loans.length} total · {loans.filter((l) => l.status === "PENDING").length} pending
          </p>
        </div>
        <form style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <input
            name="q"
            className="chat-input"
            style={{ width: 200 }}
            placeholder="Search name, phone…"
            defaultValue={query ?? ""}
          />
          <select
            name="status"
            className="chat-input"
            defaultValue={statusFilter ?? ""}
            style={{ minWidth: 140 }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>
      </div>

      <div className="dashboard-card" style={{ padding: 0, overflow: "hidden" }}>
        <LoanTable loans={loanRows} />
      </div>
    </>
  );
}
