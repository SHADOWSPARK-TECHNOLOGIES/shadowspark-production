import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateFlags } from "@/lib/trust/fraudDetection";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success, headers: rlHeaders } = await rateLimit(req, `report:${session.user.id}`, 3, "1 h");
  if (!success) {
    return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429, headers: rlHeaders });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.fraudFlag.create({
    data: {
      targetType: "LISTING",
      targetId: id,
      severity: "MEDIUM",
      reason,
      reportedBy: session.user.id,
      status: "OPEN",
    },
  });

  await evaluateFlags("LISTING", id);

  return NextResponse.json({ ok: true });
}
