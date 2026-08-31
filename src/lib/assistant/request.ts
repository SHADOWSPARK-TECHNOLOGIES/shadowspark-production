import { z } from "zod";

const assistantMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20_000),
  })
  .passthrough();

export const assistantRequestSchema = z
  .object({
    messages: z.array(assistantMessageSchema).min(1).max(50),
    slug: z.string().max(200).optional(),
  })
  .passthrough();

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

export function getLastUserMessage(messages: AssistantMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")
    ?.content ?? "";
}

export function hasExplicitDemoAcceptance(messages: AssistantMessage[]) {
  const latestUserMessage = getLastUserMessage(messages)
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(?:yes )?(?:please )?(?:schedule|book) (?:the |my |a )?(?:demo|call)(?: (?:please|now))?$/.test(
    latestUserMessage,
  );
}
