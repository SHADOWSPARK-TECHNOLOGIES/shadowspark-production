import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const demoId = formData.get("demoId") as string;

    await prisma.demo.update({
      where: { id: demoId },
      data: { approved: true }
    });

    return NextResponse.redirect(new URL("/operator", req.url));
  } catch (error) {
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
