import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.MOBILE_OPERATOR_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetId } = await req.json();
    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
    }

    const updatedTarget = await prisma.sniperTarget.update({
      where: { id: targetId },
      data: { status: 'discarded' },
    });
    
    console.log(`[SNIPER DISCARD] Target discarded: ${updatedTarget.domain}`);

    return NextResponse.json({ status: 'success', discarded: updatedTarget.id }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error("[SNIPER DISCARD] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
