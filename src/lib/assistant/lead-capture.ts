import { prisma } from "@/lib/prisma";

export interface AssistantLeadCaptureInput {
  email?: string;
  phoneNumber?: string;
  intent?: string;
  metadata?: Record<string, unknown>;
}

export interface AssistantCapturedLead {
  id: string;
  email: string | null;
}

interface AssistantLeadRow extends AssistantCapturedLead {
  [key: string]: unknown;
}

interface LeadUpsertArgs {
  where: { email: string } | { phoneNumber: string };
  update: {
    email: string | undefined;
    phoneNumber: string | undefined;
    intent: string | undefined;
    updatedAt: Date;
  };
  create: {
    email: string | null;
    phoneNumber: string | null;
    intent: string;
    status: "NEW";
    metadata: Record<string, unknown>;
  };
}

interface SystemEventCreateArgs {
  data: {
    type: "TOOL_EXECUTION";
    message: string;
    metadata: Record<string, unknown>;
  };
}

interface LeadCaptureClient {
  lead: {
    upsert(args: LeadUpsertArgs): Promise<AssistantLeadRow>;
  };
  systemEvent: {
    create(args: SystemEventCreateArgs): Promise<unknown>;
  };
}

/**
 * Creates the assistant-only capture path. It intentionally has no scoring,
 * follow-up queue, qualification, demo, or ledger dependencies.
 */
export function createLeadCaptureService(client: LeadCaptureClient) {
  return async function captureLead(input: AssistantLeadCaptureInput) {
    const email = input.email?.trim().toLowerCase() || undefined;
    const phoneNumber = input.phoneNumber?.trim() || undefined;

    if (!email && !phoneNumber) {
      throw new Error("Either email or phone number is required");
    }

    const metadata = { ...input.metadata, source: "assistant" };
    const lead = await client.lead.upsert({
      where: email ? { email } : { phoneNumber: phoneNumber! },
      // Preserve metadata already attached by operational or ledger workflows.
      update: {
        email,
        phoneNumber,
        intent: input.intent,
        updatedAt: new Date(),
      },
      create: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        intent: input.intent ?? "inquiry",
        status: "NEW",
        metadata,
      },
    });

    await client.systemEvent.create({
      data: {
        type: "TOOL_EXECUTION",
        message: "Lead captured via assistant tool",
        metadata: {
          tool: "captureLead",
          leadId: lead.id,
          source: "assistant",
        },
      },
    });

    return {
      success: true as const,
      lead: { id: lead.id, email: lead.email },
    };
  };
}

export const captureAssistantLead = createLeadCaptureService({
  lead: {
    upsert: (args) => prisma.lead.upsert(args),
  },
  systemEvent: {
    create: (args) => prisma.systemEvent.create(args),
  },
});
