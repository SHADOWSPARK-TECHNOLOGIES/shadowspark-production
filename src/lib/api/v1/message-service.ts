import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { enqueueMessageSend } from "@/lib/messages/send-queue";

const MESSAGE_TEMPLATES: Record<string, string> = {
  KYC_INFO_REQUEST: "We need additional KYC details. {{details}}",
  KYC_VERIFIED: "Your KYC is verified. We are moving to the next stage.",
  KYC_REJECTED: "Your KYC was rejected. {{reason}}",
};

const messageSendSchema = z.object({
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  to: z.string().trim().min(1),
  body: z.string().trim().min(1),
  mediaUrl: z.string().trim().url().optional(),
  loanApplicationId: z.string().trim().optional(),
  templateId: z.string().trim().optional(),
  variables: z.record(z.string(), z.string().trim()).optional(),
});

const messagesQuerySchema = z.object({
  loanApplicationId: z.string().trim().optional(),
  channel: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MessagesQuery = z.infer<typeof messagesQuerySchema>;

export interface MessagesListResult<TData> {
  data: TData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageConversation {
  loanApplicationId: string;
  applicantName: string;
  applicantPhone: string;
  channel: string;
  updatedAt: Date;
  unreadCount: number;
  lastMessage: {
    id: string;
    status: string;
    content: string;
    createdAt: Date;
  };
}

export function validateMessagesQuery(searchParams: URLSearchParams): MessagesQuery {
  return messagesQuerySchema.parse({
    loanApplicationId: searchParams.get("loanApplicationId") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}

export type SendMessageInput = z.infer<typeof messageSendSchema>;

export function validateSendMessageInput(payload: unknown): SendMessageInput {
  return messageSendSchema.parse(payload);
}

function buildMessagesWhere(query: MessagesQuery, tenantId: string): Prisma.MessageWhereInput {
  return {
    tenantId,
    loanApplicationId: query.loanApplicationId || undefined,
    channel: query.channel || undefined,
    status: query.status || undefined,
  };
}

export async function listMessages(query: MessagesQuery, tenantId: string): Promise<MessagesListResult<unknown>> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where = buildMessagesWhere(query, tenantId);

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: messages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function applyTemplateVariables(body: string, variables?: Record<string, string>): string {
  if (!variables) {
    return body;
  }

  return Object.entries(variables).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    body
  );
}

function resolveMessageBody(input: SendMessageInput): string {
  if (!input.templateId) {
    return applyTemplateVariables(input.body, input.variables);
  }

  const templateBody = MESSAGE_TEMPLATES[input.templateId];
  if (!templateBody) {
    throw new Error("MESSAGE_TEMPLATE_NOT_FOUND");
  }

  return applyTemplateVariables(templateBody, input.variables);
}

async function getOrCreateLoanApplicationForMessage(params: {
  tenantId: string;
  loanApplicationId?: string;
  to: string;
  channel: SendMessageInput["channel"];
}) {
  if (params.loanApplicationId) {
    const loan = await prisma.loanApplication.findFirst({
      where: {
        id: params.loanApplicationId,
        tenantId: params.tenantId,
      },
      select: { id: true },
    });

    if (loan) {
      return loan.id;
    }
  }

  const existing = await prisma.loanApplication.findFirst({
    where: {
      tenantId: params.tenantId,
      OR:
        params.channel === "EMAIL"
          ? [{ applicantEmail: params.to }, { applicantPhone: params.to }]
          : [{ applicantPhone: params.to }],
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.loanApplication.create({
    data: {
      tenantId: params.tenantId,
      applicantName: "Messaging Prospect",
      applicantPhone: params.channel === "EMAIL" ? "+2340000000000" : params.to,
      applicantEmail: params.channel === "EMAIL" ? params.to : undefined,
      loanAmount: new Prisma.Decimal(0),
      status: "SUBMITTED",
    },
    select: { id: true },
  });

  return created.id;
}

export async function sendMessage(tenantId: string, actorId: string | null, input: SendMessageInput) {
  const loanApplicationId = await getOrCreateLoanApplicationForMessage({
    tenantId,
    loanApplicationId: input.loanApplicationId,
    to: input.to,
    channel: input.channel,
  });

  const renderedBody = resolveMessageBody(input);
  const message = await prisma.message.create({
    data: {
      tenantId,
      loanApplicationId,
      channel: input.channel,
      status: "QUEUED",
      content: renderedBody,
      senderId: actorId ?? null,
    },
  });

  const job = await enqueueMessageSend({
    tenantId,
    channel: input.channel,
    to: input.to,
    body: renderedBody,
    mediaUrl: input.mediaUrl,
    loanApplicationId,
    templateId: input.templateId,
    variables: input.variables,
    messageId: message.id,
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      loanApplicationId,
      action: "MESSAGE_QUEUED",
      actorId,
      metadata: {
        messageId: message.id,
        jobId: job.id,
        channel: input.channel,
        templateId: input.templateId ?? null,
      },
    },
  });

  return {
    messageId: message.id,
    jobId: job.id,
    status: "QUEUED",
  };
}

export async function listMessageConversations(tenantId: string): Promise<MessageConversation[]> {
  const groupedConversations = await prisma.message.groupBy({
    by: ["loanApplicationId", "channel"],
    where: {
      tenantId,
    },
    _max: {
      createdAt: true,
    },
    orderBy: {
      _max: {
        createdAt: "desc",
      },
    },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ["loanApplicationId", "channel"],
    where: {
      tenantId,
      status: "INBOUND",
    },
    _count: {
      _all: true,
    },
  });

  const unreadCountMap = new Map<string, number>();
  for (const entry of unreadCounts) {
    unreadCountMap.set(
      `${entry.loanApplicationId}:${entry.channel}`,
      entry._count._all
    );
  }

  const loanApplicationIds = Array.from(
    new Set(groupedConversations.map((item) => item.loanApplicationId))
  );
  const loans = await prisma.loanApplication.findMany({
    where: {
      tenantId,
      id: {
        in: loanApplicationIds,
      },
    },
    select: {
      id: true,
      applicantName: true,
      applicantPhone: true,
    },
  });

  const loanMap = new Map(
    loans.map((loan) => [
      loan.id,
      {
        applicantName: loan.applicantName,
        applicantPhone: loan.applicantPhone,
      },
    ])
  );

  const lastMessages = await Promise.all(
    groupedConversations.map((conversation) =>
      prisma.message.findFirst({
        where: {
          tenantId,
          loanApplicationId: conversation.loanApplicationId,
          channel: conversation.channel,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          content: true,
          createdAt: true,
        },
      })
    )
  );

  return groupedConversations
    .map((conversation, index) => {
      const loan = loanMap.get(conversation.loanApplicationId);
      const message = lastMessages[index];
      if (!loan || !message || !conversation._max.createdAt) {
        return null;
      }

      const unreadKey = `${conversation.loanApplicationId}:${conversation.channel}`;
      return {
        loanApplicationId: conversation.loanApplicationId,
        applicantName: loan.applicantName,
        applicantPhone: loan.applicantPhone,
        channel: conversation.channel,
        updatedAt: conversation._max.createdAt,
        unreadCount: unreadCountMap.get(unreadKey) ?? 0,
        lastMessage: message,
      };
    })
    .filter((item): item is MessageConversation => item !== null);
}
