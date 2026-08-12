import { Queue, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { MESSAGE_SEND_QUEUE, type MessageSendJobData } from "@/lib/messages/send-queue";

const MESSAGE_SEND_DLQ = "message-send-dlq";

const deliveryQueue = redis
  ? new Queue<MessageSendJobData>(MESSAGE_SEND_DLQ, { connection: redis })
  : null;

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

function toTwilioAddress(channel: "WHATSAPP" | "SMS", value: string): string {
  if (channel === "WHATSAPP") {
    return value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
  }
  return value;
}

function getTwilioFrom(channel: "WHATSAPP" | "SMS"): string {
  if (channel === "WHATSAPP") {
    const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
    if (!from) {
      throw new Error("TWILIO_WHATSAPP_FROM_NOT_CONFIGURED");
    }
    return toTwilioAddress("WHATSAPP", from);
  }

  const from = process.env.TWILIO_SMS_FROM?.trim();
  if (!from) {
    throw new Error("TWILIO_SMS_FROM_NOT_CONFIGURED");
  }
  return from;
}

async function sendViaTwilio(job: MessageSendJobData): Promise<{ messageSid: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_CREDENTIALS_NOT_CONFIGURED");
  }

  const formData = new URLSearchParams();
  formData.set("To", toTwilioAddress(job.channel === "WHATSAPP" ? "WHATSAPP" : "SMS", job.to));
  formData.set("From", getTwilioFrom(job.channel === "WHATSAPP" ? "WHATSAPP" : "SMS"));
  formData.set("Body", job.body);
  if (job.mediaUrl) {
    formData.set("MediaUrl", job.mediaUrl);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    }
  );

  const payload = (await response.json()) as { sid?: string; message?: string; code?: number };
  if (!response.ok || !payload.sid) {
    const reason = payload.message ? `${payload.message}` : "Twilio send failed";
    throw new Error(reason);
  }

  return { messageSid: payload.sid };
}

async function sendEmailFallback(job: MessageSendJobData): Promise<{ messageSid: string }> {
  const syntheticMessageSid = `email-${job.messageId}-${Date.now()}`;
  return { messageSid: syntheticMessageSid };
}

/** Processes one outbound message independently of BullMQ transport. */
export async function processMessageSendJob(data: MessageSendJobData) {
  await ensureMessageTrackingColumns();
  const { tenantId } = data;

  return runWithTenantContext(tenantId, async () => {
    const message = await prisma.message.findFirst({
      where: {
        id: data.messageId,
        tenantId,
      },
      select: {
        id: true,
        loanApplicationId: true,
        status: true,
      },
    });

    if (!message) {
      throw new Error("MESSAGE_NOT_FOUND");
    }

    const deliveryResult =
      data.channel === "EMAIL"
        ? await sendEmailFallback(data)
        : await sendViaTwilio(data);

    await prisma.message.update({
      where: {
        id: message.id,
      },
      data: {
        status: "SENT",
      },
    });

    await prisma.$executeRawUnsafe(
      'UPDATE "messages" SET "twilioMessageSid" = $1, "direction" = $2 WHERE "tenantId" = $3 AND "id" = $4',
      deliveryResult.messageSid,
      "OUTBOUND",
      tenantId,
      message.id
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        loanApplicationId: message.loanApplicationId,
        action: "MESSAGE_SENT",
        metadata: {
          messageId: message.id,
          twilioMessageSid: deliveryResult.messageSid,
          channel: data.channel,
        },
      },
    });

    return {
      messageId: message.id,
      messageSid: deliveryResult.messageSid,
    };
  });
}

export const messagingWorker = redis
  ? new Worker<MessageSendJobData>(
      MESSAGE_SEND_QUEUE,
      async (job) => processMessageSendJob(job.data),
      {
        connection: redis,
        concurrency: 5,
      }
    )
  : null;

messagingWorker?.on("failed", async (job, error) => {
  if (!job) {
    return;
  }

  const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
  if (job.attemptsMade < attempts) {
    return;
  }

  await runWithTenantContext(job.data.tenantId, async () => {
    const message = await prisma.message.findFirst({
      where: {
        id: job.data.messageId,
        tenantId: job.data.tenantId,
      },
      select: {
        id: true,
        loanApplicationId: true,
      },
    });

    if (!message) {
      return;
    }

    await prisma.message.update({
      where: {
        id: message.id,
      },
      data: {
        status: "FAILED",
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: job.data.tenantId,
        loanApplicationId: message.loanApplicationId,
        action: "MESSAGE_SEND_FAILED",
        metadata: {
          messageId: message.id,
          error: error.message,
          attemptsMade: job.attemptsMade,
        },
      },
    });
  });

  if (deliveryQueue) {
    await deliveryQueue.add("message.send.failed", job.data, {
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
});
