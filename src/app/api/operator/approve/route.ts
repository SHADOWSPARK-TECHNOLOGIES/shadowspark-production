import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "APPROVED",
          demoApproved: true,
        },
      }),
      prisma.demo.updateMany({
        where: { leadId },
        data: { approved: true },
      }),
    ]);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { demo: true },
    });

    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
