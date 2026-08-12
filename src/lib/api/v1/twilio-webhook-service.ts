import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { enqueueWorkflowTrigger } from "@/lib/workflows/queue";
import {
  normalizeWhatsAppNumber,
  parseTwilioWebhookPayload,
  verifyTwilioSignature,
} from "@/lib/twilio";

const MESSAGE_CHANNEL = "WHATSAPP";
const TWILIO_WHATSAPP_PHONE_REGEX = /^\+234\d{10}$/;
const TWILIO_DEDUPE_TTL_SECONDS = 60 * 60 * 24;

let messageTrackingColumnsPromise: Promise<void> | null = null;

async function ensureMessageTrackingColumns(): Promise<void> {
  if (!messageTrackingColumnsPromise) {
    messageTrackingColumnsPromise = (async () => {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "twilioMessageSid" TEXT'
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3)'
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3)'
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT \'OUTBOUND\''
      );
    })();
  }

  return messageTrackingColumnsPromise;
}

async function getMessageIdByTwilioSid(tenantId: string, messageSid: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "messages"
    WHERE "tenantId" = ${tenantId}
      AND "twilioMessageSid" = ${messageSid}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}

async function attachTwilioMessageMetadata(params: {
  tenantId: string;
  messageId: string;
  messageSid: string;
  direction: "INBOUND" | "OUTBOUND";
}) {
  await prisma.$executeRawUnsafe(
    'UPDATE "messages" SET "twilioMessageSid" = $1, "direction" = $2 WHERE "tenantId" = $3 AND "id" = $4',
    params.messageSid,
    params.direction,
    params.tenantId,
    params.messageId
  );
}

async function getOrCreateLoanApplication(tenantId: string, phone: string) {
  const existing = await prisma.loanApplication.findFirst({
    where: {
      tenantId,
      applicantPhone: phone,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.loanApplication.create({
    data: {
      tenantId,
      applicantName: "WhatsApp Prospect",
      applicantPhone: phone,
      loanAmount: new Prisma.Decimal(0),
      status: "SUBMITTED",
    },
    select: {
      id: true,
    },
  });

  return created.id;
}

export async function processTwilioWebhook(params: {
  rawBody: string;
  requestUrl: string;
  twilioSignature: string | null;
  tenantId: string;
}) {
  await ensureMessageTrackingColumns();

  const formData = new URLSearchParams(params.rawBody);
  if (!verifyTwilioSignature(params.requestUrl, formData, params.twilioSignature)) {
    throw new Error("INVALID_TWILIO_SIGNATURE");
  }

  const payload = parseTwilioWebhookPayload(formData);
  if (!payload.messageSid || !payload.from) {
    throw new Error("INVALID_TWILIO_PAYLOAD");
  }

  const normalizedPhone = normalizeWhatsAppNumber(payload.from);
  if (!TWILIO_WHATSAPP_PHONE_REGEX.test(normalizedPhone)) {
    throw new Error("INVALID_TWILIO_PHONE");
  }

  const dedupeKey = `twilio:inbound:${params.tenantId}:${payload.messageSid}`;
  if (redis !== null) {
    const dedupeHit = await redis.set(
      dedupeKey,
      "1",
      "EX",
      TWILIO_DEDUPE_TTL_SECONDS,
      "NX"
    );
    if (!dedupeHit) {
      return { deduped: true };
    }
  }

  const existingMessageId = await getMessageIdByTwilioSid(params.tenantId, payload.messageSid);
  if (existingMessageId) {
    return { deduped: true };
  }

  const loanApplicationId = await getOrCreateLoanApplication(params.tenantId, normalizedPhone);

  const inboundMessage = payload.body.trim();
  const createdMessage = await prisma.message.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId,
      channel: MESSAGE_CHANNEL,
      status: "INBOUND",
      content: inboundMessage.length > 0 ? inboundMessage : "[media]",
      senderId: null,
    },
    select: {
      id: true,
    },
  });

  await attachTwilioMessageMetadata({
    tenantId: params.tenantId,
    messageId: createdMessage.id,
    messageSid: payload.messageSid,
    direction: "INBOUND",
  });

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId,
      action: "TWILIO_MESSAGE_RECEIVED",
      metadata: {
        messageSid: payload.messageSid,
        messageId: createdMessage.id,
        from: normalizedPhone,
        mediaCount: payload.numMedia,
      },
    },
  });

  await enqueueWorkflowTrigger({
    tenantId: params.tenantId,
    trigger: "MESSAGE_RECEIVED",
    entityType: "Message",
    entityId: createdMessage.id,
    payload: {
      loanApplicationId,
      messageSid: payload.messageSid,
      channel: MESSAGE_CHANNEL,
    },
  });

  await enqueueWorkflowTrigger({
    tenantId: params.tenantId,
    trigger: "AI_CLASSIFICATION_REQUESTED",
    entityType: "Message",
    entityId: createdMessage.id,
    payload: {
      loanApplicationId,
      messageSid: payload.messageSid,
      text: inboundMessage,
    },
  });

  return {
    deduped: false,
    messageId: createdMessage.id,
  };
}

function mapTwilioStatus(status: string): {
  nextStatus: "SENT" | "DELIVERED" | "READ" | "FAILED";
  deliveredAt: Date | null;
  readAt: Date | null;
} {
  const normalized = status.trim().toLowerCase();
  if (normalized === "delivered") {
    return { nextStatus: "DELIVERED", deliveredAt: new Date(), readAt: null };
  }
  if (normalized === "read") {
    return { nextStatus: "READ", deliveredAt: new Date(), readAt: new Date() };
  }
  if (normalized === "failed" || normalized === "undelivered") {
    return { nextStatus: "FAILED", deliveredAt: null, readAt: null };
  }

  return { nextStatus: "SENT", deliveredAt: null, readAt: null };
}

export async function processTwilioStatusWebhook(params: {
  rawBody: string;
  requestUrl: string;
  twilioSignature: string | null;
  tenantId: string;
}) {
  await ensureMessageTrackingColumns();

  const formData = new URLSearchParams(params.rawBody);
  if (!verifyTwilioSignature(params.requestUrl, formData, params.twilioSignature)) {
    throw new Error("INVALID_TWILIO_SIGNATURE");
  }

  const messageSid = formData.get("MessageSid")?.trim() ?? "";
  const messageStatus = formData.get("MessageStatus")?.trim() ?? "";
  const errorCode = formData.get("ErrorCode")?.trim() ?? "";
  const errorMessage = formData.get("ErrorMessage")?.trim() ?? "";

  if (!messageSid || !messageStatus) {
    throw new Error("INVALID_TWILIO_PAYLOAD");
  }

  const messageId = await getMessageIdByTwilioSid(params.tenantId, messageSid);
  if (!messageId) {
    return { updated: false };
  }

  const mappedStatus = mapTwilioStatus(messageStatus);
  const updated = await prisma.message.update({
    where: {
      id: messageId,
    },
    data: {
      status: mappedStatus.nextStatus,
    },
    select: {
      id: true,
      loanApplicationId: true,
    },
  });

  await prisma.$executeRawUnsafe(
    'UPDATE "messages" SET "deliveredAt" = COALESCE($1, "deliveredAt"), "readAt" = COALESCE($2, "readAt") WHERE "tenantId" = $3 AND "id" = $4',
    mappedStatus.deliveredAt,
    mappedStatus.readAt,
    params.tenantId,
    updated.id
  );

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId: updated.loanApplicationId,
      action: "TWILIO_MESSAGE_STATUS_UPDATED",
      metadata: {
        messageId: updated.id,
        messageSid,
        twilioStatus: messageStatus,
        internalStatus: mappedStatus.nextStatus,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
      },
    },
  });

  if (mappedStatus.nextStatus === "FAILED") {
    await enqueueWorkflowTrigger({
      tenantId: params.tenantId,
      trigger: "MESSAGE_RETRY_REQUESTED",
      entityType: "Message",
      entityId: updated.id,
      payload: {
        messageSid,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
      },
    });
  }

  return { updated: true };
}
