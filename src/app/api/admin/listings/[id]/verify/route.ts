import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeTruthIndex } from "@/lib/trust/computeTruthIndex";

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
  const adminId = session.user.id!;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { trustComponents: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const truthIndex = computeTruthIndex(listing.trustComponents);

  await prisma.$transaction([
    prisma.listing.update({
      where: { id },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: adminId,
        truthIndex,
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId,
        action: "LISTING_VERIFIED",
        targetType: "Listing",
        targetId: id,
        metadata: { notes: body.notes ?? null, truthIndex },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, truthIndex });
}
