import { tool } from "ai";
import { z } from "zod";

import type {
  AssistantCapturedLead,
  AssistantLeadCaptureInput,
} from "@/lib/assistant/lead-capture";

interface CaptureLeadResult {
  success: true;
  lead: AssistantCapturedLead;
}

interface AssistantLeadToolDependencies {
  captureLead(input: AssistantLeadCaptureInput): Promise<CaptureLeadResult>;
  scheduleDemo(leadId: string, email: string | null): Promise<unknown>;
  demoAccepted: boolean;
}

const captureLeadSchema = z
  .object({
    email: z.string().email().optional(),
    phoneNumber: z.string().min(5).max(40).optional(),
    intent: z.string().max(2_000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((input) => Boolean(input.email || input.phoneNumber), {
    message: "An email address or phone number is required.",
  });

export function createAssistantLeadTools({
  captureLead,
  scheduleDemo,
  demoAccepted,
}: AssistantLeadToolDependencies) {
  let requestLead: AssistantCapturedLead | null = null;
  let scheduledResult: Promise<unknown> | null = null;

  return {
    captureLead: tool({
      description:
        "Capture contact details and stated intent. Use this before scheduleDemo. This does not qualify, score, provision, or schedule the lead.",
      inputSchema: captureLeadSchema,
      execute: async (input) => {
        const result = await captureLead(input);
        requestLead = result.lead;
        return result;
      },
    }),
    scheduleDemo: tool({
      description:
        "Schedule a demo only after captureLead succeeded in this request and the user's latest message explicitly accepted scheduling.",
      inputSchema: z.object({}).strict(),
      execute: async () => {
        if (!requestLead) {
          return {
            success: false as const,
            error: "Capture the lead in this request before scheduling a demo.",
          };
        }

        if (!demoAccepted) {
          return {
            success: false as const,
            error:
              "The user must explicitly accept demo scheduling in their latest message.",
          };
        }

        scheduledResult ??= scheduleDemo(requestLead.id, requestLead.email);
        return scheduledResult;
      },
    }),
  };
}
