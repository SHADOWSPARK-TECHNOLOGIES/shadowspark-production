import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await prisma.systemEvent.create({
      data: {
        type: "error",
        message: body.message || "Unknown error",
        digest: body.digest || null,
        metadata: body.metadata || {},
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
