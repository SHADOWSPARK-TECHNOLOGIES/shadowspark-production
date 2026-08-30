import { createHmac, timingSafeEqual } from "node:crypto";
import { redis } from "@/lib/redis";

export interface TwilioWebhookPayload {
  from: string;
  to: string;
  body: string;
  numMedia: number;
  mediaUrls: string[];
  messageSid: string;
  raw: Record<string, string>;
}

function getTwilioAuthToken(): string {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured");
  }

  return token;
}

export function normalizeWhatsAppNumber(value: string): string {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, "");
  const digits = withoutPrefix.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("234")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function parseTwilioWebhookPayload(formData: URLSearchParams): TwilioWebhookPayload {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }

  const parsedMediaCount = Number.parseInt(formData.get("NumMedia") ?? "0", 10);
  const mediaCount = Number.isFinite(parsedMediaCount) && parsedMediaCount > 0 ? parsedMediaCount : 0;
  const mediaUrls = Array.from({ length: mediaCount }, (_, index) =>
    formData.get(`MediaUrl${index}`)?.trim() ?? ""
  ).filter(Boolean);

  return {
    from: normalizeWhatsAppNumber(formData.get("From") ?? ""),
    to: normalizeWhatsAppNumber(formData.get("To") ?? ""),
    body: formData.get("Body") ?? "",
    numMedia: Number.isFinite(mediaCount) ? mediaCount : 0,
    mediaUrls,
    messageSid: formData.get("MessageSid") ?? "",
    raw,
  };
}

function buildTwilioSignatureBase(url: string, params: URLSearchParams): string {
  const entries = Array.from(params.entries())
    .filter(([key]) => key !== "X-Twilio-Signature")
    .sort(([left], [right]) => left.localeCompare(right));

  let payload = url;
  for (const [key, value] of entries) {
    payload += key + value;
  }

  return payload;
}

export function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string | null
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = createHmac("sha1", getTwilioAuthToken());
  hmac.update(buildTwilioSignatureBase(url, params));
  const expected = hmac.digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function twilioEmptyResponseXml(): string {
  return "<Response/>";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function twilioMessageResponseXml(message: string): string {
  return `<Response><Message>${escapeXml(message)}</Message></Response>`;
}

const TWILIO_DAILY_OUTBOUND_CAP = 80;

export async function reserveTwilioOutbound(): Promise<boolean> {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const key = `twilio:outbound:${day}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60 * 48);
  if (count <= TWILIO_DAILY_OUTBOUND_CAP) return true;
  await redis.decr(key);
  return false;
}

function twilioAddress(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("whatsapp:")
    ? trimmed
    : `whatsapp:${trimmed.startsWith("+") ? trimmed : `+${trimmed}`}`;
}

export async function sendTwilioMessage(
  to: string,
  body: string,
): Promise<{ success: boolean; messageId?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from || !(await reserveTwilioOutbound())) {
    return { success: false };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: twilioAddress(to),
          From: twilioAddress(from),
          Body: body,
        }).toString(),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as { sid?: string };
    if (!response.ok) return { success: false };
    return { success: true, messageId: payload.sid };
  } catch (error) {
    console.error("[twilio] outbound message failed", error instanceof Error ? error.message : "unknown error");
    return { success: false };
  }
}
