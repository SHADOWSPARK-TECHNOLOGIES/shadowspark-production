import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const LISTING_EXPIRY_DAYS = 90;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the owner or an admin may renew
  if (listing.ownerId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.listing.update({
    where: { id },
    data: { expiresAt, reminderSent: false, active: true },
  });

  return NextResponse.json({ ok: true, expiresAt });
}
