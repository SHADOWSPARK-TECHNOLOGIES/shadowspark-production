"use client";

import Link from "next/link";
import type { LoanApplication } from "@/generated/prisma/client";
import { KycStatusBadge } from "./KycStatusBadge";

type LoanRow = Pick<
  LoanApplication,
  "id" | "applicantName" | "phoneNumber" | "loanAmountKobo" | "purpose" | "status" | "createdAt"
> & { kycStatus?: string };

interface LoanTableProps {
  loans: LoanRow[];
}

const STATUS_COLOURS: Record<string, string> = {
  PENDING: "var(--color-gold)",
  UNDER_REVIEW: "var(--color-primary)",
  KYC_REQUIRED: "var(--color-notification)",
  APPROVED: "var(--color-success)",
  REJECTED: "var(--color-notification)",
  DISBURSED: "var(--color-teal)",
  DEFAULTED: "var(--color-notification)",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOURS[status] ?? "var(--color-text-muted)";
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatNgn(kobo: bigint): string {
  return `₦${(Number(kobo) / 100).toLocaleString("en-NG")}`;
}

export function LoanTable({ loans }: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)" }}>
        No loan applications found.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th className="hidden md:table-cell">Phone</th>
            <th>Amount</th>
            <th className="hidden md:table-cell">Purpose</th>
            <th>Status</th>
            <th className="hidden md:table-cell">KYC</th>
            <th className="hidden md:table-cell">Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>
                <strong>{loan.applicantName}</strong>
              </td>
              <td className="hidden md:table-cell" style={{ color: "var(--color-text-muted)" }}>
                {loan.phoneNumber}
              </td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatNgn(loan.loanAmountKobo)}
              </td>
              <td
                className="hidden md:table-cell"
                style={{ color: "var(--color-text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {loan.purpose}
              </td>
              <td>
                <StatusPill status={loan.status} />
              </td>
              <td className="hidden md:table-cell">
                {loan.kycStatus ? <KycStatusBadge status={loan.kycStatus} /> : "—"}
              </td>
              <td className="hidden md:table-cell" style={{ color: "var(--color-text-muted)" }}>
                {new Date(loan.createdAt).toLocaleDateString("en-NG")}
              </td>
              <td>
                <Link
                  href={`/dashboard/loans/${loan.id}`}
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
