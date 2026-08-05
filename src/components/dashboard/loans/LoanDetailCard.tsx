"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { KycStatusBadge } from "./KycStatusBadge";
import { DocumentViewer } from "./DocumentViewer";
import { approveLoan, rejectLoan } from "@/app/actions/loans";
import type { LoanApplication, KycRecord, LoanDocument } from "@/generated/prisma/client";

type LoanDetail = LoanApplication & {
  kycRecord: KycRecord | null;
  documents: LoanDocument[];
};

interface LoanDetailCardProps {
  loan: LoanDetail;
}

function formatNgn(kobo: bigint): string {
  return `₦${(Number(kobo) / 100).toLocaleString("en-NG")}`;
}

export function LoanDetailCard({ loan }: LoanDetailCardProps) {
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveLoan(loan.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to approve");
      }
    });
  }

  function handleReject() {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (!rejectReason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectLoan(loan.id, rejectReason);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to reject");
      }
    });
  }

  const isActionable = ["PENDING", "UNDER_REVIEW", "KYC_REQUIRED"].includes(loan.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Applicant info */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">Applicant Details</h3>
        </div>
        <div className="grid-2" style={{ gap: "var(--space-4)" }}>
          {[
            ["Name", loan.applicantName],
            ["Phone", loan.phoneNumber],
            ["Email", loan.email ?? "—"],
            ["Amount", formatNgn(loan.loanAmountKobo)],
            ["Purpose", loan.purpose],
            ["Status", loan.status.replace(/_/g, " ")],
            ["Applied", new Date(loan.createdAt).toLocaleDateString("en-NG")],
            ["Reviewed By", loan.reviewedBy ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="score-dimension">
              <span className="score-dim-label">{label}</span>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KYC */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">KYC Verification</h3>
          {loan.kycRecord && <KycStatusBadge status={loan.kycRecord.status} />}
        </div>
        {loan.kycRecord ? (
          <div className="grid-2" style={{ gap: "var(--space-4)" }}>
            {[
              ["BVN", loan.kycRecord.bvnNumber],
              ["Verified Name", loan.kycRecord.verifiedName ?? "—"],
              ["Date of Birth", loan.kycRecord.dateOfBirth ?? "—"],
              ["Provider Ref", loan.kycRecord.providerRef ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="score-dimension">
                <span className="score-dim-label">{label}</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            KYC not yet initiated.
          </p>
        )}
      </div>

      {/* Documents */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">Documents</h3>
        </div>
        <DocumentViewer documents={loan.documents} />
      </div>

      {/* Actions */}
      {isActionable && (
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Decision</h3>
          </div>

          {error && (
            <p style={{ color: "var(--color-notification)", marginBottom: "var(--space-4)", fontSize: 13 }}>
              {error}
            </p>
          )}

          {showRejectInput && (
            <textarea
              className="chat-input"
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: "100%", marginBottom: "var(--space-4)", minHeight: 80 }}
            />
          )}

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={isPending}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <CheckCircle size={15} />
              {isPending ? "Processing…" : "Approve"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleReject}
              disabled={isPending}
              style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-notification)" }}
            >
              <XCircle size={15} />
              {showRejectInput ? "Confirm Reject" : "Reject"}
            </button>
            <a
              href={`/dashboard/loans/${loan.id}/communicate`}
              className="btn btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <MessageCircle size={15} /> Message
            </a>
          </div>
        </div>
      )}

      {loan.rejectionReason && (
        <div
          style={{
            padding: "var(--space-4)",
            background: "var(--color-notification)11",
            border: "1px solid var(--color-notification)44",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--color-notification)",
          }}
        >
          <strong>Rejection reason:</strong> {loan.rejectionReason}
        </div>
      )}
    </div>
  );
}
