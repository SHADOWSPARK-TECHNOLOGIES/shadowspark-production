import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { runWithTenantContext } from "@/lib/tenant-context";
import { enqueueWorkflowTrigger } from "@/lib/workflows/queue";
import {
  buildConversationResolution,
  buildConversationSummary,
  loadConversationState,
  saveConversationState,
  type ConversationRecord,
} from "@/lib/conversation-state";
import {
  normalizeWhatsAppNumber,
  parseTwilioWebhookPayload,
  twilioEmptyResponseXml,
  verifyTwilioSignature,
} from "@/lib/twilio";
import { logger } from "@/lib/logger";
import { randomUUID } from "node:crypto";

const MESSAGE_DEDUPE_TTL_SECONDS = 60 * 60 * 24;
const MESSAGE_CHANNEL = "WHATSAPP";
const TENANT_ID = process.env.TWILIO_LOAN_TENANT_ID?.trim() || "public";
const TWILIO_WHATSAPP_PHONE_REGEX = /^\+234\d{10}$/;

let messageDirectionColumnPromise: Promise<void> | null = null;

async function ensureMessageDirectionColumn(): Promise<void> {
  if (!messageDirectionColumnPromise) {
    messageDirectionColumnPromise = prisma.$executeRawUnsafe(
      'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT \'OUTBOUND\''
    ).then(() => undefined);
  }

  return messageDirectionColumnPromise;
}

async function getOrCreateLoanApplication(tenantId: string, phone: string) {
  const existing = await prisma.loanApplication.findFirst({
    where: {
      tenantId,
      applicantPhone: phone,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.loanApplication.create({
    data: {
      tenantId,
      applicantName: "WhatsApp Prospect",
      applicantPhone: phone,
      loanAmount: new Prisma.Decimal(0),
      status: "SUBMITTED",
    },
  });
}

async function storeInboundMessage(params: {
  tenantId: string;
  loanApplicationId: string;
  content: string;
  messageSid: string;
}) {
  await ensureMessageDirectionColumn();

  await prisma.$executeRawUnsafe(
    'INSERT INTO "messages" ("id", "tenantId", "loanApplicationId", "channel", "status", "content", "senderId", "direction", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
    randomUUID(),
    params.tenantId,
    params.loanApplicationId,
    MESSAGE_CHANNEL,
    "INBOUND",
    params.content,
    null,
    "INBOUND"
  );

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      action: "TWILIO_MESSAGE_RECEIVED",
      metadata: {
        messageSid: params.messageSid,
        direction: "INBOUND",
      },
    },
  });

  await enqueueWorkflowTrigger({
    tenantId: params.tenantId,
    trigger: "MESSAGE_RECEIVED",
    entityType: "Message",
    entityId: params.messageSid,
    payload: {
      loanApplicationId: params.loanApplicationId,
      content: params.content,
    },
  });
}

async function upsertKycDocument(params: {
  tenantId: string;
  loanApplicationId: string;
  type: "ID_DOCUMENT" | "ADDRESS_DOCUMENT" | "SELFIE";
  documentUrl: string;
  messageSid: string;
}) {
  const existing = await prisma.kycDocument.findFirst({
    where: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      type: params.type,
    },
  });

  if (existing) {
    await prisma.kycDocument.update({
      where: { id: existing.id },
      data: {
        fileUrl: params.documentUrl,
        status: "PENDING",
        ocrData: {
          messageSid: params.messageSid,
        },
      },
    });
    return;
  }

  await prisma.kycDocument.create({
    data: {
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      type: params.type,
      status: "PENDING",
      fileUrl: params.documentUrl,
      ocrData: {
        messageSid: params.messageSid,
      },
    },
  });
}

async function persistConversationResolution(params: {
  tenantId: string;
  loanApplicationId: string;
  phone: string;
  resolution: ReturnType<typeof buildConversationResolution>;
  messageSid: string;
  mediaUrls: string[];
}) {
  const { resolution } = params;
  const nextRecord: ConversationRecord = {
    state: resolution.nextState,
    tenantId: params.tenantId,
    phone: params.phone,
    loanApplicationId: params.loanApplicationId,
    data: resolution.data,
    updatedAt: new Date().toISOString(),
    nextPrompt: resolution.prompt,
    lastMessageSid: params.messageSid,
  };

  await saveConversationState(nextRecord);

  if (resolution.state === "IDLE") {
    return;
  }

  if (resolution.accepted && resolution.state === "ID_DOCUMENT" && params.mediaUrls[0]) {
    await upsertKycDocument({
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      type: "ID_DOCUMENT",
      documentUrl: params.mediaUrls[0],
      messageSid: params.messageSid,
    });
  }

  if (resolution.accepted && resolution.state === "ADDRESS_DOCUMENT" && params.mediaUrls[0]) {
    await upsertKycDocument({
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      type: "ADDRESS_DOCUMENT",
      documentUrl: params.mediaUrls[0],
      messageSid: params.messageSid,
    });
  }

  if (resolution.accepted && resolution.state === "SELFIE" && params.mediaUrls[0]) {
    await upsertKycDocument({
      tenantId: params.tenantId,
      loanApplicationId: params.loanApplicationId,
      type: "SELFIE",
      documentUrl: params.mediaUrls[0],
      messageSid: params.messageSid,
    });
  }

  if (resolution.shouldPersistLoan) {
    await prisma.loanApplication.update({
      where: {
        id: params.loanApplicationId,
      },
      data: {
        applicantName: resolution.data.name ?? undefined,
        applicantPhone: resolution.data.phone ?? undefined,
        loanAmount: resolution.data.amount ? new Prisma.Decimal(resolution.data.amount) : undefined,
        loanPurpose: resolution.data.purpose ?? undefined,
      },
    });
  }

  if (resolution.nextState === "SUBMITTED") {
    await prisma.loanApplication.update({
      where: {
        id: params.loanApplicationId,
      },
      data: {
        applicantName: resolution.data.name ?? undefined,
        applicantPhone: resolution.data.phone ?? undefined,
        loanAmount: resolution.data.amount ? new Prisma.Decimal(resolution.data.amount) : undefined,
        loanPurpose: resolution.data.purpose ?? undefined,
        status: "SUBMITTED",
      },
    });
  }
}

function buildNextResolutionPayload(params: {
  current: ConversationRecord;
  message: string;
  from: string;
  mediaUrls: string[];
}): ReturnType<typeof buildConversationResolution> {
  return buildConversationResolution(params.current, {
    text: params.message,
    from: params.from,
    mediaUrls: params.mediaUrls,
  });
}

export async function POST(request: Request) {
  let dedupeKey: string | null = null;

  try {
    const rawBody = await request.text();
    const formData = new URLSearchParams(rawBody);
    const signature = request.headers.get("X-Twilio-Signature");

    if (!verifyTwilioSignature(request.url, formData, signature)) {
      return NextResponse.json({ success: false, error: "Invalid Twilio signature" }, { status: 403 });
    }

    const payload = parseTwilioWebhookPayload(formData);
    if (!payload.messageSid || !payload.from) {
      return NextResponse.json({ success: false, error: "Missing Twilio payload" }, { status: 400 });
    }

    const normalizedPhone = normalizeWhatsAppNumber(payload.from);
    if (!TWILIO_WHATSAPP_PHONE_REGEX.test(normalizedPhone)) {
      return NextResponse.json({ success: false, error: "Invalid sender phone number" }, { status: 400 });
    }

    dedupeKey = `twilio:${TENANT_ID}:${payload.messageSid}`;
    const dedupeHit = await redis.set(
      dedupeKey,
      "1",
      "EX",
      MESSAGE_DEDUPE_TTL_SECONDS,
      "NX"
    );

    if (!dedupeHit) {
      return new NextResponse(twilioEmptyResponseXml(), {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

    await runWithTenantContext(TENANT_ID, async () => {
      const loan = await getOrCreateLoanApplication(TENANT_ID, normalizedPhone);
      const current = await loadConversationState({
        tenantId: TENANT_ID,
        phone: normalizedPhone,
        loanApplicationId: loan.id,
      });

      const resolution =
        current.state === "IDLE"
          ? buildConversationResolution(current, {
              text: payload.body,
              from: normalizedPhone,
              mediaUrls: payload.mediaUrls,
            })
          : buildNextResolutionPayload({
              current,
              message: payload.body,
              from: normalizedPhone,
              mediaUrls: payload.mediaUrls,
            });

      await storeInboundMessage({
        tenantId: TENANT_ID,
        loanApplicationId: loan.id,
        content: payload.body,
        messageSid: payload.messageSid,
      });

      await persistConversationResolution({
        tenantId: TENANT_ID,
        loanApplicationId: loan.id,
        phone: normalizedPhone,
        resolution,
        messageSid: payload.messageSid,
        mediaUrls: payload.mediaUrls,
      });

      await prisma.auditLog.create({
        data: {
          tenantId: TENANT_ID,
          loanApplicationId: loan.id,
          action: "TWILIO_LOAN_CONVERSATION_ADVANCED",
          metadata: {
            messageSid: payload.messageSid,
            from: normalizedPhone,
            state: current.state,
            nextState: resolution.nextState,
            summary: buildConversationSummary(resolution.data),
          },
        },
      });
      logger.info(
        { tenantId: TENANT_ID, loanApplicationId: loan.id, messageSid: payload.messageSid },
        "twilio loan intake processed"
      );
    });
  } catch (error) {
    if (dedupeKey) {
      await redis.del(dedupeKey);
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Twilio webhook failed" },
      { status: 500 }
    );
  }

  return new NextResponse(twilioEmptyResponseXml(), {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export const dynamic = "force-dynamic";
