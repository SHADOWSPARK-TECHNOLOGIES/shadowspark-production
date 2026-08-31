import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueMessageSend } from "@/lib/messages/send-queue";
import { enqueueMessage } from "@/lib/messages/queue";

const channelSchema = z.enum(["WHATSAPP", "SMS", "EMAIL"]);

const sendMessageSchema = z.object({
  channel: channelSchema,
  to: z.string().trim().min(1),
  body: z.string().trim().min(1),
  loanApplicationId: z.string().trim().min(1).optional(),
  mediaUrl: z.string().trim().url().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export function validateSendMessageInput(input: unknown): SendMessageInput {
  return sendMessageSchema.parse(input);
}

function renderTemplate(body: string, variables?: Record<string, string>): string {
  if (!variables) return body;
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export async function listConversations(tenantId: string) {
  const grouped = await prisma.message.groupBy({
    by: ["loanApplicationId", "channel"],
    where: { tenantId },
    _max: { createdAt: true },
  });

  if (grouped.length === 0) {
    return [];
  }

  const loanIds = grouped
    .map((row) => row.loanApplicationId)
    .filter((loanId): loanId is string => typeof loanId === "string" && loanId.length > 0);
  const loans = loanIds.length
    ? await prisma.loanApplication.findMany({
        where: { id: { in: loanIds }, tenantId },
        select: { id: true, applicantName: true, applicantPhone: true },
      })
    : [];
  const loanMap = new Map(loans.map((loan) => [loan.id, loan]));

  const unreadRows = await prisma.message.groupBy({
    by: ["loanApplicationId", "channel"],
    where: { tenantId, status: "INBOUND" },
    _count: { _all: true },
  });

  const unreadMap = new Map(
    unreadRows.map((row) => [`${row.loanApplicationId ?? ""}:${row.channel}`, row._count._all])
  );

  const conversations = await Promise.all(
    grouped.map(async (row) => {
      const loan = row.loanApplicationId ? loanMap.get(row.loanApplicationId) : undefined;
      const lastMessage = await prisma.message.findFirst({
        where: {
          tenantId,
          loanApplicationId: row.loanApplicationId,
          channel: row.channel,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        loanApplicationId: row.loanApplicationId,
        contactName: loan?.applicantName ?? null,
        contactPhone: loan?.applicantPhone ?? null,
        channel: row.channel,
        unreadCount: unreadMap.get(`${row.loanApplicationId ?? ""}:${row.channel}`) ?? 0,
        lastMessage: lastMessage?.content ?? null,
        lastMessageStatus: lastMessage?.status ?? null,
        updatedAt: row._max.createdAt ?? null,
      };
    })
  );

  conversations.sort((a, b) => {
    const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return right - left;
  });

  return conversations;
}

export const listMessageConversations = listConversations;

export async function listMessages(tenantId: string, conversationId: string) {
  return prisma.message.findMany({
    where: {
      tenantId,
      loanApplicationId: conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

interface SendMessageResult {
  status: "QUEUED";
  messageId: string;
  jobId: string | null;
}

async function sendMessageWithInput(
  tenantId: string,
  actorUserId: string | undefined,
  input: SendMessageInput,
  useLegacyQueue = false
): Promise<SendMessageResult> {
  const renderedBody = renderTemplate(input.body, input.variables);

  if (input.loanApplicationId) {
    const loan = await prisma.loanApplication.findFirst({
      where: {
        id: input.loanApplicationId,
        tenantId,
      },
      select: { id: true },
    });
    if (!loan) {
      throw new Error("LOAN_NOT_FOUND");
    }
  }

  const created = await prisma.message.create({
    data: {
      tenantId,
      loanApplicationId: input.loanApplicationId,
      channel: input.channel,
      status: "QUEUED",
      content: renderedBody,
      senderId: actorUserId ?? null,
    },
    select: { id: true },
  });

  let jobId: string | null = null;
  if (useLegacyQueue) {
    await enqueueMessage(tenantId, created.id);
  } else {
    try {
      const job = await enqueueMessageSend({
        tenantId,
        messageId: created.id,
        channel: input.channel,
        to: input.to,
        body: renderedBody,
        loanApplicationId: input.loanApplicationId,
        mediaUrl: input.mediaUrl,
        variables: input.variables,
      });
      jobId = String(job.id);
    } catch {
      await enqueueMessage(tenantId, created.id);
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      loanApplicationId: input.loanApplicationId ?? null,
      actorId: actorUserId ?? null,
      action: "MESSAGE_QUEUED",
      metadata: {
        messageId: created.id,
        channel: input.channel,
      },
    },
  });

  return {
    status: "QUEUED",
    messageId: created.id,
    jobId,
  };
}

type LegacySendMessageInput = {
  loanApplicationId?: string;
  channel: string;
  content: string;
  to?: string;
};

export async function sendMessage(
  tenantId: string,
  userIdOrInput: string | LegacySendMessageInput,
  inputOrActorId?: SendMessageInput | string,
  bodyArg?: string
): Promise<SendMessageResult> {
  if (typeof userIdOrInput === "object" && userIdOrInput !== null) {
    const legacy = userIdOrInput;
    const actorUserId = typeof inputOrActorId === "string" ? inputOrActorId : undefined;
    const normalized = validateSendMessageInput({
      channel: String(legacy.channel).toUpperCase(),
      to: legacy.to ?? "+2340000000000",
      body: legacy.content,
      loanApplicationId: legacy.loanApplicationId,
    });
    return sendMessageWithInput(tenantId, actorUserId, normalized, true);
  }

  if (typeof inputOrActorId === "string" && typeof bodyArg === "string") {
    const normalized = validateSendMessageInput({
      to: userIdOrInput,
      channel: inputOrActorId,
      body: bodyArg,
    });
    return sendMessageWithInput(tenantId, undefined, normalized);
  }

  if (typeof inputOrActorId === "object" && inputOrActorId !== null) {
    return sendMessageWithInput(tenantId, userIdOrInput, validateSendMessageInput(inputOrActorId));
  }

  throw new Error("INVALID_SEND_MESSAGE_SIGNATURE");
}
