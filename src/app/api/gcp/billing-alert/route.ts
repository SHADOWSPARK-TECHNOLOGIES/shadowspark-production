/**
 * Receives GCP billing budget alerts via Pub/Sub push
 * When spend hits 80%+ — sends WhatsApp alert to founder
 * When spend hits 100% — triggers emergency notification
 */
import { NextRequest, NextResponse } from 'next/server';

interface BillingAlert {
  budgetDisplayName: string;
  alertThresholdExceeded: number;
  costAmount: number;
  costIntervalStart: string;
  budgetAmount: number;
  budgetAmountType: string;
  currencyCode: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Pub/Sub message is base64 encoded
    const message = Buffer.from(body.message.data, 'base64').toString();
    const alert: BillingAlert = JSON.parse(message);

    const percentUsed = alert.alertThresholdExceeded * 100;
    const project = alert.budgetDisplayName;
    const spent = `${alert.currencyCode} ${alert.costAmount}`;
    const budget = `${alert.currencyCode} ${alert.budgetAmount}`;

    console.log(`[BILLING ALERT] ${project}: ${percentUsed}% used (${spent} of ${budget})`);

    // Send WhatsApp alert to founder
    if (percentUsed >= 80) {
      await fetch(`${process.env.NEXTAUTH_URL}/api/internal/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: percentUsed >= 100 ? 'BILLING_CRITICAL' : 'BILLING_WARNING',
          message: `🚨 GCP Alert: ${project} is at ${percentUsed}% budget. Spent: ${spent} of ${budget}`,
          channel: 'whatsapp',
        }),
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[BILLING ALERT ERROR]', err);
    return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
  }
}
