import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processInboundReply } from '@/lib/email/reply-processor';

export async function POST(req: NextRequest) {
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
