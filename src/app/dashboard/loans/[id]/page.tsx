import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LoanDetailCard } from "@/components/dashboard/loans/LoanDetailCard";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const loan = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      kycRecord: true,
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (!loan) notFound();

  return (
    <>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Link href="/dashboard/loans" className="btn btn-ghost" style={{ padding: "4px 8px" }}>
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h2 className="card-title">{loan.applicantName}</h2>
            <p className="card-sub">Application #{id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <LoanDetailCard loan={loan} />
    </>
  );
}
