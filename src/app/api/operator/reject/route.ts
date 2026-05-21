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

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "REJECTED",
        demoApproved: false,
      },
      include: { demo: true },
    });

    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
  }
}
