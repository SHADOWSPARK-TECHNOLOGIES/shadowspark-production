import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleCorsPreflight, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader === "Bearer undefined" || authHeader === "Bearer null") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

    return withCors(
      NextResponse.json({ status: 'success', discarded: updatedTarget.id }),
      req,
      "POST, OPTIONS"
    );

  } catch (error) {
    console.error("[SNIPER DISCARD] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, "POST, OPTIONS");
}
