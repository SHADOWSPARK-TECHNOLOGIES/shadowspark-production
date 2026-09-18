import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { processInboundReply } from '@/lib/email/reply-processor';

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature =
    req.headers.get("resend-signature") ||
    req.headers.get("x-resend-signature") ||
    req.headers.get("authorization");

  if (!signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleanToken = signature.startsWith("Bearer ") ? signature.slice(7) : signature;
  const isValid =
    cleanToken.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(secret));

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const formData = await req.formData();
  const from = formData.get('from') as string;
  const text = formData.get('text') as string;

  const lead = await prisma.lead.findFirst({
    where: { email: from },
  });

  if (lead) {
    await prisma.emailEvent.create({
      data: {
        leadId: lead.id,
        type: 'replied',
        metadata: { text },
      },
    });

    await processInboundReply(lead.id, text);
  }

  return NextResponse.json({ received: true });
}
