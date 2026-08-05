import { z } from "zod";

export const workflowNodeTypeSchema = z.enum(["TRIGGER", "AI_CLASSIFY", "SEND_MESSAGE", "API_CALL", "CONDITION", "DELAY", "HUMAN_ESCALATION"]);

export const workflowNodeSchema = z.object({
  key: z.string().min(1),
  type: workflowNodeTypeSchema,
  config: z.record(z.string(), z.unknown()).default({}),
  next: z.array(z.string()).default([]),
  retryPolicy: z.object({ attempts: z.number().int().min(1).max(10).default(3), backoffMs: z.number().int().min(1000).default(10000) }).optional(),
});

export const workflowDefinitionSchema = z.object({
  tenantId: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string().min(1),
  nodes: z.array(workflowNodeSchema).min(1),
});

export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
