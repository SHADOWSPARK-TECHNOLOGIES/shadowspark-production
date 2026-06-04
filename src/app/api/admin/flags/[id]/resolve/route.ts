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
  const { status, resolution } = body as { status?: string; resolution?: string };

  if (status !== "RESOLVED" && status !== "DISMISSED") {
    return NextResponse.json({ error: "status must be RESOLVED or DISMISSED" }, { status: 400 });
  }
  if (!resolution?.trim()) {
    return NextResponse.json({ error: "resolution is required" }, { status: 400 });
  }

  const flag = await prisma.fraudFlag.findUnique({ where: { id } });
  if (!flag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.fraudFlag.update({
    where: { id },
    data: { status, resolution },
  });

  return NextResponse.json({ ok: true });
}
