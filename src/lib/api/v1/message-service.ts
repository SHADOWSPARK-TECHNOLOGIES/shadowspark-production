import { prisma } from "@/lib/prisma";

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

  // Count unread per (loanApplicationId, channel)
  const convMap = new Map<string, typeof messages[0]>();
  for (const m of messages) {
    const k = `${m.loanApplicationId}:${m.channel}`;
    if (!convMap.has(k)) convMap.set(k, m);
  }

  return Array.from(convMap.values()).map(m => ({
    loanApplicationId: m.loanApplicationId,
    applicantName: m.loanApplication?.applicantName ?? "Unknown",
    applicantPhone: m.loanApplication?.applicantPhone ?? "",
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
      createdAt: true, updatedAt: true,
    },
  });
  return msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }));
}

export async function sendMessage(
  tenantId: string,
  loanApplicationId: string,
  channel: string,
  content: string,
  senderId?: string,
) {
  const msg = await prisma.message.create({
    data: { tenantId, loanApplicationId, channel, content, direction: "OUTBOUND", status: "SENT", senderId },
    select: {
      id: true, tenantId: true, loanApplicationId: true, channel: true,
      direction: true, status: true, content: true, createdAt: true, updatedAt: true,
    },
  });
  return { ...msg, createdAt: msg.createdAt.toISOString(), updatedAt: msg.updatedAt.toISOString() };
}
