import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { updateLeadEngagement } from '@/lib/scoring/engagement-scorer';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not configured');
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('resend-signature') || '';

  try {
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[Resend Webhook] Signature verification error:', message);
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { type, data } = event;

  const leadId = data.headers?.find((h: { name: string; value: string }) => h.name === 'X-Lead-Id')?.value;
  if (!leadId) return NextResponse.json({ received: true });

  const eventMap: Record<string, string> = {
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.delivered': 'delivered'
  };

  const eventType = eventMap[type];

  if (eventType) {
    const metadata = { link: data.click?.link, timestamp: data.created_at };
    
    await prisma.emailEvent.create({
      data: {
        leadId,
        type: eventType,
        metadata,
      },
    });

    if (eventType === 'opened' || eventType === 'clicked') {
      await updateLeadEngagement(leadId, eventType, metadata).catch(err => {
        console.error('[SCORING ENGINE ERROR]', err);
      });
    }
  }

  return NextResponse.json({ received: true });
}
