import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { EmailTemplate } from "@/components/email/EmailTemplate";

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

    const target = await prisma.sniperTarget.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    if (target.status !== 'analyzed' && target.status !== 'draft_ready') {
      return NextResponse.json({ error: `Target not ready to fire. Status: ${target.status}` }, { status: 400 });
    }

    if (!target.email || !target.draftEmail) {
      return NextResponse.json({ error: "Target is missing critical data (email or draft)" }, { status: 400 });
    }

    try {
      // Use local sendEmail stub: (to, subject, html)
      await sendEmail(target.email, `${target.companyName} Conversion Leak`, target.draftEmail);

      const updatedTarget = await prisma.sniperTarget.update({
        where: { id: targetId },
        data: { status: 'fired' },
      });

      console.log(`[SNIPER FIRE] Successfully fired at ${target.domain}`);
      return NextResponse.json({ status: 'success', target: updatedTarget }, { headers: { 'Access-Control-Allow-Origin': '*' } });

    } catch (emailError) {
      console.error(`[SNIPER FIRE] Resend failed for ${target.domain}:`, emailError);
      return NextResponse.json({ error: "Failed to dispatch email via Resend" }, { status: 500 });
    }

  } catch (error) {
    console.error("[SNIPER FIRE] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
