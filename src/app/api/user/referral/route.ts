import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [totalReferred, completedReferrals] = await Promise.all([
    prisma.referral.count({ where: { referrerId: session.user.id } }),
    prisma.referral.count({ where: { referrerId: session.user.id, status: "COMPLETED" } }),
  ]);

  return NextResponse.json({
    code: user.referralCode,
    totalReferred,
    completedReferrals,
  });
}
