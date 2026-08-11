import { createHmac, timingSafeEqual } from "node:crypto";

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
