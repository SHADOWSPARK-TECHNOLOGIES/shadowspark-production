import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateFlags } from "@/lib/trust/fraudDetection";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const targetType = searchParams.get("targetType") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const where = {
    ...(status ? { status } : {}),
    ...(targetType ? { targetType } : {}),
  };

  const [flags, total] = await Promise.all([
    prisma.fraudFlag.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fraudFlag.count({ where }),
  ]);

  return NextResponse.json({ flags, total, page });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { targetType, targetId, severity, reason } = body as {
    targetType?: string;
    targetId?: string;
    severity?: string;
    reason?: string;
  };

  if (!targetType || !targetId || !severity || !reason?.trim()) {
    return NextResponse.json({ error: "targetType, targetId, severity, reason are required" }, { status: 400 });
  }

  const flag = await prisma.fraudFlag.create({
    data: {
      targetType,
      targetId,
      severity,
      reason,
      reportedBy: session.user.id!,
      status: "OPEN",
    },
  });

  const evaluation = await evaluateFlags(targetType as "LISTING" | "USER", targetId);

  return NextResponse.json({ flag, evaluation });
}
