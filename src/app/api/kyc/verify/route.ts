/**
 * POST /api/kyc/verify
 *
 * Triggers BVN verification for a loan application.
 * Protected — requires an active session.
 *
 * Request body:
 *   { "bvnNumber": "12345678901", "loanApplicationId": "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyBVN } from "@/lib/kyc/bvn";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bvnNumber?: string; loanApplicationId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bvnNumber, loanApplicationId } = body;
  if (!bvnNumber || !loanApplicationId) {
    return NextResponse.json(
      { error: "bvnNumber and loanApplicationId are required" },
      { status: 400 }
    );
  }

  const application = await prisma.loanApplication.findUnique({
    where: { id: loanApplicationId },
    include: { kycRecord: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const result = await verifyBVN(bvnNumber);

  const kycData = {
    bvnNumber,
    status: result.verified ? "VERIFIED" : "FAILED",
    verifiedName: result.name ?? null,
    dateOfBirth: result.dateOfBirth ?? null,
    providerRef: result.providerRef ?? null,
    providerPayload: (result.raw ?? null) as object | null,
    verifiedAt: result.verified ? new Date() : null,
  };

  // Upsert the KYC record
  const kycRecord = await prisma.kycRecord.upsert({
    where: { applicationId: loanApplicationId },
    update: kycData,
    create: { applicationId: loanApplicationId, ...kycData },
  });

  // Advance application status if KYC passed
  if (result.verified && application.status === "PENDING") {
    await prisma.loanApplication.update({
      where: { id: loanApplicationId },
      data: { status: "UNDER_REVIEW" },
    });
  }

  return NextResponse.json({
    verified: result.verified,
    kycRecordId: kycRecord.id,
    name: result.name,
    error: result.error,
  });
}
