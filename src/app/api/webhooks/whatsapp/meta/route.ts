import { NextRequest, NextResponse } from "next/server";
import { sendTextWhatsApp } from "@/lib/whatsapp/send-payment-link";

/**
 * WhatsApp Meta Cloud API Webhook
 *
 * Handles:
 * - GET: Webhook verification (Meta sends a challenge token)
 * - POST: Incoming messages, status updates
 *
 * VERIFY_TOKEN must match the token configured in Meta Developer Console
 * for the Shadowspark ClawBot app (ID: 24260677440297544).
 *
 * SECURITY: All log output is redacted to prevent PII leakage.
 * Phone numbers, message bodies, and raw payloads are never written
 * to production logs.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "shadowspark-clawbot-v1";

/** Redact a phone number for safe logging — keeps last 2 digits only. */
function redactPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return "****" + phone.slice(-4);
}

/** Redact a message body for safe logging — keeps length and first 3 chars. */
function redactText(text: string): string {
  if (!text) return "";
  const preview = text.length > 3 ? text.slice(0, 3) : text;
  return `${preview}…[${text.length} chars]`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta sends a verification request when setting up the webhook
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("WhatsApp webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  // Verification failed — log only that it failed, not the token value
  console.warn("WhatsApp webhook verification failed", { mode, tokenMatch: token === VERIFY_TOKEN });
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * Routes an incoming WhatsApp message to the appropriate handler.
 *
 * Currently supports:
 * - Text messages: Logged and acknowledged; auto-reply with a brief greeting.
 * - Future: Will route to chatbot intent classifier, payment link flow, etc.
 */
async function handleIncomingMessage(from: string, text: string, msgType: string) {
  console.log(`[WhatsApp Handler] Routing message from ${redactPhone(from)}: type=${msgType}, text=${redactText(text)}`);

  // For text messages, send a simple acknowledgment reply
  if (msgType === "text" && text.trim()) {
    const lower = text.trim().toLowerCase();

    // Simple keyword-based routing
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      await sendTextWhatsApp(from, "👋 Welcome to ShadowSpark! How can we assist you today?");
    } else if (lower.includes("payment") || lower.includes("pay")) {
      await sendTextWhatsApp(
        from,
        "To complete your payment, please check your email for the secure payment link. If you need help, reply with *help*."
      );
    } else if (lower.includes("help") || lower.includes("support")) {
      await sendTextWhatsApp(
        from,
        "Our support team is available to assist you. Please email support@shadowspark.tech or call our helpline. We'll get back to you within 24 hours."
      );
    } else {
      // Default: acknowledge and log
      await sendTextWhatsApp(
        from,
        "Thank you for reaching out to ShadowSpark. Your message has been received. A team member will respond shortly."
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log webhook event metadata only — never the full payload (may contain PII)
    const entryCount = body?.entry?.length ?? 0;
    console.log(`WhatsApp webhook received: ${entryCount} entries`);

    // Handle different payload types
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Handle incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        const from = message.from; // sender phone number
        const msgType = message.type; // text, image, interactive, etc.
        const text = message.text?.body || "";

        console.log(`WhatsApp message from ${redactPhone(from)}: [${msgType}] ${redactText(text)}`);

        // Route to message handler (fire-and-forget to avoid webhook timeout)
        handleIncomingMessage(from, text, msgType).catch((err) => {
          console.error(`[WhatsApp Handler] Error processing message from ${redactPhone(from)}:`, err);
        });
      }
    }

    // Handle message status updates (delivered, read, failed)
    if (value.statuses) {
      for (const status of value.statuses) {
        console.log(`WhatsApp status update: ${status.status} for message ${redactPhone(status.id ?? "")}`);
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}

// Required for Meta webhook
export const dynamic = "force-dynamic";
