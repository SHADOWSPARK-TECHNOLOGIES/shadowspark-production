/**
 * POST /api/webhooks/whatsapp-loan
 *
 * Twilio webhook for incoming WhatsApp messages on the loan intake number.
 * Validates the Twilio signature, dispatches to the loan bot state machine,
 * and replies with a TwiML response.
 *
 * Twilio sends form-encoded POST bodies:
 *   From    — sender's WhatsApp number e.g. "whatsapp:+2348012345678"
 *   Body    — text content
 *   MediaUrl0 — (optional) media URL for documents
 *   MediaContentType0 — (optional) MIME type
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fintechConfig } from "@/lib/config/fintech";
import { processLoanBotMessage } from "@/lib/whatsapp/loan-bot";
import { sendLoanBotMessage } from "@/lib/whatsapp/loan-messaging";

// ── Twilio signature validation ───────────────────────────────────────────────

function validateTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Build the validation string per Twilio docs:
  // URL + sorted param key/value pairs concatenated
  const sortedKeys = Object.keys(params).sort();
  let validationString = url;
  for (const key of sortedKeys) {
    validationString += key + (params[key] ?? "");
  }

  const expectedSig = crypto
    .createHmac("sha1", authToken)
    .update(validationString)
    .digest("base64");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(twilioSignature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authToken } = fintechConfig.twilio;

  // Parse form body
  const formText = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(formText)) {
    params[k] = v;
  }

  // Validate Twilio signature (skip in mock/dev mode when no authToken set)
  if (authToken) {
    const twilioSignature = req.headers.get("x-twilio-signature") ?? "";
    const url = req.url;

    if (!validateTwilioSignature(authToken, twilioSignature, url, params)) {
      console.warn("[WhatsApp-Loan] Invalid Twilio signature");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const from = params["From"] ?? "";
  const body = params["Body"] ?? "";
  const mediaUrl = params["MediaUrl0"];
  const mediaContentType = params["MediaContentType0"];

  if (!from) {
    return NextResponse.json({ error: "Missing From" }, { status: 400 });
  }

  try {
    const reply = await processLoanBotMessage({ from, body, mediaUrl, mediaContentType });

    if (reply) {
      // Fire-and-forget reply — don't block the webhook response
      sendLoanBotMessage(from, reply).catch((err) =>
        console.error("[WhatsApp-Loan] Reply send error:", err)
      );
    }

    // Return empty TwiML — we handle the reply ourselves
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (err) {
    console.error("[WhatsApp-Loan] Handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
