/**
 * WhatsApp messaging helpers for the Fintech OS loan flow.
 *
 * Uses the Twilio WhatsApp Business API to send free-form text messages
 * and loan-specific template messages.
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID    — Twilio account SID
 *   TWILIO_AUTH_TOKEN     — Twilio auth token
 *   TWILIO_WHATSAPP_FROM  — Sender number e.g. "whatsapp:+14155238886"
 */

import { fintechConfig } from "@/lib/config/fintech";

export type LoanMessageResult = {
  success: boolean;
  messageSid?: string;
  error?: string;
};

function twilioApiUrl(accountSid: string) {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
}

function basicAuth(accountSid: string, authToken: string) {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

/**
 * Send a free-form text WhatsApp message via Twilio.
 */
export async function sendLoanBotMessage(
  to: string,
  body: string
): Promise<LoanMessageResult> {
  const { accountSid, authToken, from } = fintechConfig.twilio;

  // Console fallback in dev / when credentials absent
  if (!accountSid || !authToken) {
    console.log(
      "[LoanBot:DISABLED] Would send to %s:\n%s",
      to,
      body
    );
    return { success: true, messageSid: "console-fallback" };
  }

  const toNormalized = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const formData = new URLSearchParams({
      From: from,
      To: toNormalized,
      Body: body,
    });

    const res = await fetch(twilioApiUrl(accountSid), {
      method: "POST",
      headers: {
        Authorization: basicAuth(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) {
      console.error("[LoanBot:SEND_ERROR]", data);
      return { success: false, error: data.message ?? `HTTP ${res.status}` };
    }
    return { success: true, messageSid: data.sid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LoanBot:EXCEPTION]", msg);
    return { success: false, error: msg };
  }
}
