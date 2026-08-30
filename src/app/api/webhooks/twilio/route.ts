import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { generateAssistantReply } from "@/lib/llm";
import {
  normalizeWhatsAppNumber,
  parseTwilioWebhookPayload,
  reserveTwilioOutbound,
  sendTwilioMessage,
  twilioEmptyResponseXml,
  twilioMessageResponseXml,
  verifyTwilioSignature,
} from "@/lib/twilio";
import {
  advanceQualifier,
  isWithinFreeformWindow,
  readQualifierState,
  type QualifierState,
} from "@/lib/twilio-qualifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGE_DEDUPE_TTL_SECONDS = 60 * 60 * 24;
const QUALIFIER_TENANT = process.env.TWILIO_QUALIFIER_TENANT_ID?.trim() || "public";
const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

function xmlResponse(message?: string): Response {
  return new Response(message ? twilioMessageResponseXml(message) : twilioEmptyResponseXml(), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function metadataWithState(metadata: unknown, state: QualifierState): Prisma.InputJsonValue {
  const current = metadata && typeof metadata === "object" ? metadata : {};
  return { ...(current as Record<string, unknown>), twilioQualifier: state } as unknown as Prisma.InputJsonValue;
}

async function persistLead(params: {
  from: string;
  text: string;
  existing: { metadata: unknown; status?: string | null; tier?: string | null } | null;
  state: QualifierState;
  completed: boolean;
}): Promise<void> {
  const { from, text, existing, state, completed } = params;
  await prisma.lead.upsert({
    where: { phoneNumber: from },
    update: {
      phoneNumber: from,
      intent: state.answers[0] || text,
      lastMessage: text,
      status: completed ? "QUALIFIED" : existing?.status || "NEW",
      tier: state.tag || existing?.tier || undefined,
      metadata: metadataWithState(existing?.metadata, state),
    },
    create: {
      phoneNumber: from,
      intent: state.answers[0] || text,
      lastMessage: text,
      status: completed ? "QUALIFIED" : "NEW",
      tier: state.tag,
      metadata: metadataWithState(null, state),
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  let dedupeKey: string | null = null;

  try {
    const rawBody = await request.text();
    const formData = new URLSearchParams(rawBody);
    const signature = request.headers.get("x-twilio-signature");
    const signatureUrl = process.env.TWILIO_WEBHOOK_URL?.trim() || request.url;

    if (!verifyTwilioSignature(signatureUrl, formData, signature)) {
      return new Response("Forbidden", { status: 403 });
    }

    const payload = parseTwilioWebhookPayload(formData);
    const normalizedPhone = normalizeWhatsAppNumber(payload.from);
    if (!payload.messageSid || !payload.body.trim()) return xmlResponse();
    if (!E164_PHONE_REGEX.test(normalizedPhone)) return new Response("Invalid sender", { status: 400 });

    dedupeKey = `twilio:qualifier:${QUALIFIER_TENANT}:${payload.messageSid}`;
    const dedupeHit = await redis.set(
      dedupeKey,
      "1",
      "EX",
      MESSAGE_DEDUPE_TTL_SECONDS,
      "NX",
    );
    if (!dedupeHit) return xmlResponse();

    const existing = await prisma.lead.findUnique({
      where: { phoneNumber: normalizedPhone },
      select: { metadata: true, status: true, tier: true },
    });
    const current = readQualifierState(existing?.metadata);
    const receivedAt = new Date();
    const receivedState: QualifierState = {
      ...current,
      messageSids: [...current.messageSids.slice(-49), payload.messageSid],
      lastInboundAt: receivedAt.toISOString(),
    };

    if (existing && !isWithinFreeformWindow(current, receivedAt)) {
      await persistLead({
        from: normalizedPhone,
        text: payload.body,
        existing,
        state: receivedState,
        completed: Boolean(current.completedAt),
      });
      return xmlResponse();
    }

    if (current.completedAt) {
      if (!(await reserveTwilioOutbound())) {
        await persistLead({
          from: normalizedPhone,
          text: payload.body,
          existing,
          state: receivedState,
          completed: true,
        });
        return xmlResponse();
      }

      const reply = await generateAssistantReply(payload.body);
      await persistLead({
        from: normalizedPhone,
        text: payload.body,
        existing,
        state: receivedState,
        completed: true,
      });
      return xmlResponse(reply.text);
    }

    if (!(await reserveTwilioOutbound())) {
      await persistLead({
        from: normalizedPhone,
        text: payload.body,
        existing,
        state: receivedState,
        completed: false,
      });
      return xmlResponse();
    }

    const { state, reply, completed } = advanceQualifier(current, payload.body, receivedAt);
    const finalState: QualifierState = { ...state, messageSids: receivedState.messageSids };
    await persistLead({
      from: normalizedPhone,
      text: payload.body,
      existing,
      state: finalState,
      completed,
    });

    if (completed && !current.operatorNotified && process.env.TWILIO_NOTIFY_TO?.trim()) {
      const notification = await sendTwilioMessage(
        process.env.TWILIO_NOTIFY_TO,
        `New ${finalState.tag} Twilio lead: ${normalizedPhone}`,
      );
      if (notification.success) {
        await persistLead({
          from: normalizedPhone,
          text: payload.body,
          existing,
          state: { ...finalState, operatorNotified: true },
          completed: true,
        });
      }
    }

    return xmlResponse(reply);
  } catch (error) {
    if (dedupeKey) await redis.del(dedupeKey).catch(() => undefined);
    console.error("[twilio] qualifier webhook failed", error instanceof Error ? error.message : "unknown error");
    return new Response("Webhook processing failed", { status: 500 });
  }
}
