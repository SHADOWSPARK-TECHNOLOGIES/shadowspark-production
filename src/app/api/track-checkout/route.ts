import { NextResponse } from 'next/server';
import { trackCheckoutView } from '@/app/actions/track-checkout';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leadId = body?.leadId ?? 'unknown';
    const res = await trackCheckoutView(leadId);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[API] track-checkout error', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
