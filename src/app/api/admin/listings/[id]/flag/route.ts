import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type Severity = (typeof VALID_SEVERITIES)[number];

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
  const { reason, severity } = body as { reason?: string; severity?: string };

  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }
  if (!severity || !VALID_SEVERITIES.includes(severity as Severity)) {
    return NextResponse.json({ error: "severity must be LOW | MEDIUM | HIGH | CRITICAL" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminId = session.user.id!;
  const autosuspend = severity === "CRITICAL";

  await prisma.$transaction([
    prisma.listing.update({
      where: { id },
      data: {
        verificationStatus: "FLAGGED",
        ...(autosuspend ? { active: false, suspendedAt: new Date(), suspendReason: `Auto-suspended: CRITICAL fraud flag — ${reason}` } : {}),
      },
    }),
    prisma.fraudFlag.create({
      data: { targetType: "LISTING", targetId: id, severity, reason, reportedBy: adminId, status: "OPEN" },
    }),
    prisma.adminAction.create({
      data: {
        adminId,
        action: "LISTING_FLAGGED",
        targetType: "Listing",
        targetId: id,
        metadata: { reason, severity, autosuspend },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, autosuspended: autosuspend });
}
