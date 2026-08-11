import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const workflowNodeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.union([z.literal("start"), z.literal("task"), z.literal("condition"), z.literal("end")]),
  label: z.string().trim().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const workflowEdgeSchema = z.object({
  id: z.string().trim().min(1),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  condition: z.string().trim().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  nodes: z.array(workflowNodeSchema).min(2),
  edges: z.array(workflowEdgeSchema).min(1),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const executeWorkflowSchema = z.object({
  input: z.record(z.string(), z.unknown()).default({}),
});
export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;

export async function listWorkflows(tenantId: string) {
  return prisma.workflow.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    select: { id: true, tenantId: true, name: true, description: true, nodes: true, edges: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function createWorkflow(
  tenantId: string,
  input: CreateWorkflowInput,
  actorId?: string,
) {
  return prisma.workflow.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      nodes: input.nodes as unknown[],
      edges: input.edges as unknown[],
      createdById: actorId,
    },
    select: { id: true, tenantId: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export interface WorkflowExecutionResult {
  executionId: string;
  status: "COMPLETED" | "FAILED";
  output: Record<string, unknown>;
  error?: string;
}

export async function executeWorkflow(
  tenantId: string,
  workflowId: string,
  input: ExecuteWorkflowInput,
  actorId?: string,
): Promise<WorkflowExecutionResult | null> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId, isActive: true },
  });
  if (!workflow) return null;

  const execution = await prisma.workflowExecution.create({
    data: {
      tenantId,
      workflowId,
      status: "PENDING",
      input: input.input,
    },
  });

  try {
    const nodes = workflow.nodes as Array<{ id: string; type: string; config?: Record<string, unknown> }>;
    const edges = workflow.edges as Array<{ id: string; source: string; target: string; condition?: string }>;

    const startNode = nodes.find((n) => n.type === "start");
    if (!startNode) throw new Error("Workflow missing start node");

    const context = { ...input.input };
    const visited = new Set<string>();
    let currentNode = startNode;

    while (currentNode && currentNode.type !== "end") {
      if (visited.has(currentNode.id)) throw new Error("Workflow cycle detected");
      visited.add(currentNode.id);

      if (currentNode.type === "task") {
        const taskConfig = currentNode.config ?? {};
        if (taskConfig.assignVariable && taskConfig.value !== undefined) {
          context[taskConfig.assignVariable as string] = taskConfig.value;
        }
      } else if (currentNode.type === "condition") {
        const conditionConfig = currentNode.config ?? {};
        const variable = conditionConfig.variable as string | undefined;
        const conditionValue = variable ? context[variable] : undefined;
        const outgoing = edges.filter((e) => e.source === currentNode!.id);
        const match = outgoing.find((e) => {
          if (!e.condition) return true;
          return String(conditionValue) === e.condition;
        }) ?? outgoing[0];
        if (!match) throw new Error(`No outgoing edge from condition ${currentNode.id}`);
        currentNode = nodes.find((n) => n.id === match.target)!;
        continue;
      }

      const outgoing = edges.find((e) => e.source === currentNode!.id);
      if (!outgoing) throw new Error(`No outgoing edge from node ${currentNode.id}`);
      currentNode = nodes.find((n) => n.id === outgoing.target)!;
    }

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "COMPLETED", output: context, completedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "WORKFLOW_EXECUTED",
        actorId,
        metadata: { workflowId, executionId: execution.id, status: "COMPLETED" },
      },
    });

    return { executionId: execution.id, status: "COMPLETED", output: context };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow execution failed";
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "FAILED", error: message, completedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "WORKFLOW_EXECUTED",
        actorId,
        metadata: { workflowId, executionId: execution.id, status: "FAILED", error: message },
      },
    });

    return { executionId: execution.id, status: "FAILED", output: {}, error: message };
  }
}
