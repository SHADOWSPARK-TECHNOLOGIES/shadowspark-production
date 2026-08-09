import { Queue, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export const MESSAGE_QUEUE = "message-send";

export interface MessageJobData {
  tenantId: string;
  messageId: string;
}

let messageQueue: Queue<MessageJobData> | null = null;

function getMessageQueue(): Queue<MessageJobData> {
  if (!messageQueue) {
    messageQueue = new Queue<MessageJobData>(MESSAGE_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    });
  }
  return messageQueue;
}

export async function enqueueMessage(tenantId: string, messageId: string): Promise<void> {
  await getMessageQueue().add("send", { tenantId, messageId });
}

interface SenderResult {
  provider: string;
  providerMessageId: string;
  status: "SENT" | "FAILED";
  error?: string;
}

async function sendViaProvider(
  channel: string,
  content: string,
  recipientPhone?: string,
): Promise<SenderResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber || channel !== "sms") {
    // Mock provider for demo / when Twilio is not fully configured.
    return {
      provider: "mock",
      providerMessageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "SENT",
    };
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
          From: fromNumber,
          To: recipientPhone ?? "",
          Body: content,
        }).toString(),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { provider: "twilio", providerMessageId: "", status: "FAILED", error };
    }

    const data = await response.json() as { sid: string };
    return { provider: "twilio", providerMessageId: data.sid, status: "SENT" };
  } catch (error) {
    return {
      provider: "twilio",
      providerMessageId: "",
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function processMessageJob(data: MessageJobData): Promise<void> {
  const { tenantId, messageId } = data;

  const message = await prisma.message.findFirst({
    where: { id: messageId, tenantId },
    include: { loanApplication: { select: { applicantPhone: true } } },
  });
  if (!message) return;

  const result = await sendViaProvider(
    message.channel,
    message.content,
    message.loanApplication?.applicantPhone ?? undefined,
  );

  await prisma.message.update({
    where: { id: messageId },
    data: {
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId || null,
      error: result.error || null,
      sentAt: result.status === "SENT" ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      loanApplicationId: message.loanApplicationId,
      action: result.status === "SENT" ? "MESSAGE_SENT" : "MESSAGE_FAILED",
      actorId: message.senderId,
      metadata: {
        messageId,
        channel: message.channel,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        error: result.error,
      },
    },
  });
}

export function startMessageWorker(): Worker<MessageJobData> {
  return new Worker<MessageJobData>(
    MESSAGE_QUEUE,
    async (job) => {
      await processMessageJob(job.data);
    },
    { connection: redis },
  );
}
