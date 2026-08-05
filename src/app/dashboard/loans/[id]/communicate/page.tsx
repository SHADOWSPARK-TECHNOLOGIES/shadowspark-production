import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CommunicateClient } from "@/components/dashboard/loans/CommunicateClient";

export const dynamic = "force-dynamic";

export default async function LoanCommunicatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const loan = await prisma.loanApplication.findUnique({
    where: { id },
    select: { id: true, applicantName: true, phoneNumber: true },
  });

  if (!loan) notFound();

  return (
    <CommunicateClient
      loanId={loan.id}
      applicantName={loan.applicantName}
      phoneNumber={loan.phoneNumber}
    />
  );
}
