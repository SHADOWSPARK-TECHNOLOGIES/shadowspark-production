/**
 * POST /api/webhooks/disbursement
 *
 * Called by an external disbursement system (core banking, Paystack Transfer,
 * Flutterwave Payout, etc.) when a loan has been disbursed.
 *
 * Request body:
 *   { "loanApplicationId": "...", "reference": "...", "amount": 50000 }
 *
 * Security: HMAC-SHA256 signature in X-Disbursement-Signature header
 *   signature = HMAC_SHA256(rawBody, DISBURSEMENT_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fintechConfig } from "@/lib/config/fintech";
import { prisma } from "@/lib/prisma";
import { sendDisbursementNotification } from "@/lib/whatsapp/disbursement";

function verifySignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const { webhookSecret } = fintechConfig.disbursement;

  if (webhookSecret) {
    const signature = req.headers.get("x-disbursement-signature") ?? "";
    if (!verifySignature(webhookSecret, rawBody, signature)) {
      console.warn("[Disbursement-Webhook] Invalid signature");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let payload: { loanApplicationId?: string; reference?: string };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { loanApplicationId, reference } = payload;
  if (!loanApplicationId) {
    return NextResponse.json({ error: "Missing loanApplicationId" }, { status: 400 });
  }

  // Update loan status to DISBURSED
  const application = await prisma.loanApplication.findUnique({
    where: { id: loanApplicationId },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  await prisma.loanApplication.update({
    where: { id: loanApplicationId },
    data: {
      status: "DISBURSED",
      disbursedAt: new Date(),
      notes: reference ? `Disbursement ref: ${reference}` : undefined,
    },
  });

  // Send WhatsApp notification
  const notifResult = await sendDisbursementNotification(loanApplicationId);
  if (!notifResult.success) {
    // Log but don't fail the webhook — disbursement already recorded
    console.error("[Disbursement-Webhook] WhatsApp notification failed:", notifResult.error);
  }

  return NextResponse.json({ received: true });
}
