import { z } from "zod";
import { redis } from "@/lib/redis";

export const CONVERSATION_TTL_SECONDS = 60 * 60 * 24;

export const CONVERSATION_STATES = {
  IDLE: {
    prompt: "Welcome to ShadowSpark loans. What is your full name?",
    nextState: "NAME" as const,
    validate: (input: ConversationInput) => input.text.trim().length > 0,
  },
  NAME: {
    prompt: "What is your full name?",
    nextState: "PHONE" as const,
    validate: (input: ConversationInput) => input.text.trim().length >= 2,
  },
  PHONE: {
    prompt: "Please confirm your phone number in +234XXXXXXXXXX format.",
    nextState: "AMOUNT" as const,
    validate: (input: ConversationInput) =>
      PHONE_REGEX.test(input.text.trim()) || isConfirmationText(input.text),
  },
  AMOUNT: {
    prompt: "How much do you want to borrow?",
    nextState: "PURPOSE" as const,
    validate: (input: ConversationInput) => parseMoney(input.text) !== null,
  },
  PURPOSE: {
    prompt: "What will the loan be used for?",
    nextState: "ID_DOCUMENT" as const,
    validate: (input: ConversationInput) => input.text.trim().length >= 3,
  },
  ID_DOCUMENT: {
    prompt: "Please upload your ID document.",
    nextState: "ADDRESS_DOCUMENT" as const,
    validate: (input: ConversationInput) => input.mediaUrls.length > 0,
  },
  ADDRESS_DOCUMENT: {
    prompt: "Please upload a proof of address document.",
    nextState: "SELFIE" as const,
    validate: (input: ConversationInput) => input.mediaUrls.length > 0,
  },
  SELFIE: {
    prompt: "Please upload a selfie for verification.",
    nextState: "REVIEW" as const,
    validate: (input: ConversationInput) => input.mediaUrls.length > 0,
  },
  REVIEW: {
    prompt: "Reply YES to submit your loan application.",
    nextState: "SUBMITTED" as const,
    validate: (input: ConversationInput) => isConfirmationText(input.text),
  },
  SUBMITTED: {
    prompt: "Your loan application has been submitted.",
    nextState: "SUBMITTED" as const,
    validate: () => true,
  },
} as const;

export type ConversationState = keyof typeof CONVERSATION_STATES;

const PHONE_REGEX = /^\+234\d{10}$/;
const CONFIRMATION_REGEX = /^(yes|y|submit|confirm|ok|okay)$/i;

const conversationDataSchema = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  amount: z.string().trim().optional(),
  purpose: z.string().trim().optional(),
  idDocumentUrl: z.string().trim().optional(),
  addressDocumentUrl: z.string().trim().optional(),
  selfieUrl: z.string().trim().optional(),
});

const conversationRecordSchema = z.object({
  state: z.enum([
    "IDLE",
    "NAME",
    "PHONE",
    "AMOUNT",
    "PURPOSE",
    "ID_DOCUMENT",
    "ADDRESS_DOCUMENT",
    "SELFIE",
    "REVIEW",
    "SUBMITTED",
  ]),
  tenantId: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  loanApplicationId: z.string().trim().min(1),
  data: conversationDataSchema,
  updatedAt: z.string().trim().min(1),
  nextPrompt: z.string().trim().optional(),
  lastMessageSid: z.string().trim().optional(),
});

export type ConversationData = z.infer<typeof conversationDataSchema>;
export type ConversationRecord = z.infer<typeof conversationRecordSchema>;

export interface ConversationInput {
  text: string;
  from: string;
  mediaUrls: string[];
}

export interface ConversationResolution {
  state: ConversationState;
  nextState: ConversationState;
  prompt: string;
  accepted: boolean;
  reason?: string;
  data: ConversationData;
  shouldPersistLoan: boolean;
}

function isConfirmationText(text: string): boolean {
  return CONFIRMATION_REGEX.test(text.trim());
}

function parseMoney(text: string): string | null {
  const cleaned = text.replace(/[,_\s]/g, "").replace(/^₦/u, "");
  return /^\d+(\.\d+)?$/.test(cleaned) ? cleaned : null;
}

function emptyConversationRecord(params: {
  tenantId: string;
  phone: string;
  loanApplicationId: string;
}): ConversationRecord {
  return {
    state: "IDLE",
    tenantId: params.tenantId,
    phone: params.phone,
    loanApplicationId: params.loanApplicationId,
    data: {},
    updatedAt: new Date().toISOString(),
  };
}

export function getConversationKey(tenantId: string, phone: string): string {
  return `conv:${tenantId}:${phone}`;
}

export async function loadConversationState(params: {
  tenantId: string;
  phone: string;
  loanApplicationId: string;
}): Promise<ConversationRecord> {
  const key = getConversationKey(params.tenantId, params.phone);
  const raw = await redis.get(key);
  if (!raw || typeof raw !== "string") {
    return emptyConversationRecord(params);
  }

  try {
    const parsed = conversationRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return emptyConversationRecord(params);
    }

    return parsed.data;
  } catch {
    return emptyConversationRecord(params);
  }
}

export async function saveConversationState(record: ConversationRecord): Promise<void> {
  const key = getConversationKey(record.tenantId, record.phone);
  await redis.set(key, JSON.stringify(record), "EX", CONVERSATION_TTL_SECONDS);
}

export function buildConversationResolution(
  current: ConversationRecord,
  input: ConversationInput
): ConversationResolution {
  const step = CONVERSATION_STATES[current.state];
  const text = input.text.trim();

  switch (current.state) {
    case "IDLE":
      return {
        state: current.state,
        nextState: "NAME",
        prompt: CONVERSATION_STATES.NAME.prompt,
        accepted: true,
        data: current.data,
        shouldPersistLoan: false,
      };
    case "NAME":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please provide your full name.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "PHONE",
        prompt: CONVERSATION_STATES.PHONE.prompt,
        accepted: true,
        data: {
          ...current.data,
          name: text,
        },
        shouldPersistLoan: true,
      };
    case "PHONE": {
      const phone = PHONE_REGEX.test(text) ? text : input.from;
      if (!PHONE_REGEX.test(phone) && !isConfirmationText(text)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please reply with a +234 phone number or confirm your WhatsApp number.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "AMOUNT",
        prompt: CONVERSATION_STATES.AMOUNT.prompt,
        accepted: true,
        data: {
          ...current.data,
          phone,
        },
        shouldPersistLoan: true,
      };
    }
    case "AMOUNT": {
      const amount = parseMoney(text);
      if (!amount) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please provide a numeric loan amount.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "PURPOSE",
        prompt: CONVERSATION_STATES.PURPOSE.prompt,
        accepted: true,
        data: {
          ...current.data,
          amount,
        },
        shouldPersistLoan: true,
      };
    }
    case "PURPOSE":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please describe how the loan will be used.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "ID_DOCUMENT",
        prompt: CONVERSATION_STATES.ID_DOCUMENT.prompt,
        accepted: true,
        data: {
          ...current.data,
          purpose: text,
        },
        shouldPersistLoan: true,
      };
    case "ID_DOCUMENT":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please upload at least one ID document image.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "ADDRESS_DOCUMENT",
        prompt: CONVERSATION_STATES.ADDRESS_DOCUMENT.prompt,
        accepted: true,
        data: {
          ...current.data,
          idDocumentUrl: input.mediaUrls[0],
        },
        shouldPersistLoan: false,
      };
    case "ADDRESS_DOCUMENT":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please upload a proof of address document.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "SELFIE",
        prompt: CONVERSATION_STATES.SELFIE.prompt,
        accepted: true,
        data: {
          ...current.data,
          addressDocumentUrl: input.mediaUrls[0],
        },
        shouldPersistLoan: false,
      };
    case "SELFIE":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Please upload a selfie photo.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "REVIEW",
        prompt: CONVERSATION_STATES.REVIEW.prompt,
        accepted: true,
        data: {
          ...current.data,
          selfieUrl: input.mediaUrls[0],
        },
        shouldPersistLoan: false,
      };
    case "REVIEW":
      if (!step.validate(input)) {
        return {
          state: current.state,
          nextState: current.state,
          prompt: step.prompt,
          accepted: false,
          reason: "Reply YES to submit your loan application.",
          data: current.data,
          shouldPersistLoan: false,
        };
      }

      return {
        state: current.state,
        nextState: "SUBMITTED",
        prompt: CONVERSATION_STATES.SUBMITTED.prompt,
        accepted: true,
        data: current.data,
        shouldPersistLoan: true,
      };
    case "SUBMITTED":
      return {
        state: current.state,
        nextState: "SUBMITTED",
        prompt: step.prompt,
        accepted: true,
        data: current.data,
        shouldPersistLoan: false,
      };
  }
}

export function buildConversationSummary(data: ConversationData): string {
  return [
    `Name: ${data.name ?? "Unknown"}`,
    `Phone: ${data.phone ?? "Unknown"}`,
    `Amount: ${data.amount ?? "Unknown"}`,
    `Purpose: ${data.purpose ?? "Unknown"}`,
  ].join(" | ");
}
