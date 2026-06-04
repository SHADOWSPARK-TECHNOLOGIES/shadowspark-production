import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason: string | undefined = body.reason;

  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required for rejection" }, { status: 400 });
  }

  const existing = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "APPROVED") {
    return NextResponse.json({ error: "Cannot reject an already-approved request" }, { status: 409 });
  }

  const adminId = session.user.id!;

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason },
    }),
    prisma.adminAction.create({
      data: {
        adminId,
        action: "KYC_REJECTED",
        targetType: "VerificationRequest",
        targetId: id,
        metadata: { userId: existing.userId, type: existing.type, reason },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
