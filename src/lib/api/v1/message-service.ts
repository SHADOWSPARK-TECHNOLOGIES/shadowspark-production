import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueMessage } from "@/lib/messages/queue";

export const sendMessageSchema = z.object({
  loanApplicationId: z.string().trim().min(1),
  channel: z.enum(["sms", "email", "whatsapp"]),
  content: z.string().trim().min(1),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export async function listConversations(tenantId: string) {
  const messages = await prisma.message.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    distinct: ["loanApplicationId", "channel"],
    select: {
      id: true, loanApplicationId: true, channel: true, content: true,
      status: true, createdAt: true,
      loanApplication: { select: { applicantName: true, applicantPhone: true } },
    },
  });

  const convMap = new Map<string, typeof messages[0]>();
  for (const m of messages) {
    const k = `${m.loanApplicationId}:${m.channel}`;
    if (!convMap.has(k)) convMap.set(k, m);
  }

  return Array.from(convMap.values()).map(m => ({
    loanApplicationId: m.loanApplicationId,
    applicantName: m.loanApplication?.applicantName ?? "Unknown",
    applicantPhone: maskPhone(m.loanApplication?.applicantPhone ?? ""),
    channel: m.channel,
    updatedAt: m.createdAt.toISOString(),
    unreadCount: 0,
    lastMessage: { id: m.id, status: m.status, content: m.content, createdAt: m.createdAt.toISOString() },
  }));
}

export async function listMessages(tenantId: string, loanApplicationId: string) {
  const msgs = await prisma.message.findMany({
    where: { tenantId, loanApplicationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, tenantId: true, loanApplicationId: true, channel: true,
      direction: true, status: true, content: true, senderId: true,
      provider: true, providerMessageId: true, error: true,
      sentAt: true, deliveredAt: true, readAt: true,
      createdAt: true, updatedAt: true,
    },
  });
  return msgs.map(m => ({
    ...m,
    sentAt: m.sentAt?.toISOString() ?? null,
    deliveredAt: m.deliveredAt?.toISOString() ?? null,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

export async function sendMessage(
  tenantId: string,
  input: SendMessageInput,
  senderId?: string,
) {
  const msg = await prisma.message.create({
    data: {
      tenantId,
      loanApplicationId: input.loanApplicationId,
      channel: input.channel,
      direction: "OUTBOUND",
      status: "QUEUED",
      content: input.content,
      senderId,
    },
    select: {
      id: true, tenantId: true, loanApplicationId: true, channel: true,
      direction: true, status: true, content: true, senderId: true,
      createdAt: true, updatedAt: true,
    },
  });

  await enqueueMessage(tenantId, msg.id);

  return {
    ...msg,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  };
}

export async function updateMessageStatus(
  tenantId: string,
  messageId: string,
  status: "DELIVERED" | "READ" | "FAILED",
  metadata?: { error?: string; providerMessageId?: string },
) {
  const data: Record<string, unknown> = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();
  if (status === "READ") data.readAt = new Date();
  if (metadata?.error) data.error = metadata.error;
  if (metadata?.providerMessageId) data.providerMessageId = metadata.providerMessageId;

  return prisma.message.updateMany({
    where: { id: messageId, tenantId },
    data,
  });
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : "***";
}
