import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const workflowContextSchema = z.record(z.string(), z.json());

/** Schema for persisted workflow nodes accepted by the execution engine. */
export const workflowNodeSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    type: z.enum(["start", "task", "action", "condition", "end"]),
    label: z.string().trim().max(200).optional(),
    config: workflowContextSchema.default({}),
  })
  .strict();
type WorkflowNode = z.infer<typeof workflowNodeSchema>;

/** Schema for a directed transition between persisted workflow nodes. */
export const workflowEdgeSchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    source: z.string().trim().min(1).max(128),
    target: z.string().trim().min(1).max(128),
    condition: z.string().trim().max(500).optional(),
  })
  .strict();
type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

/** Validates bounded workflow definitions before persistence. */
export const createWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    nodes: z.array(workflowNodeSchema).min(2).max(100),
    edges: z.array(workflowEdgeSchema).min(1).max(200),
  })
  .strict();
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

/** Validates the JSON context supplied to a workflow execution. */
export const executeWorkflowSchema = z
  .object({
    input: workflowContextSchema.default({}),
  })
  .strict();
export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;

/** Lists active workflows within the authenticated tenant boundary. */
export async function listWorkflows(tenantId: string) {
  return prisma.workflow.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

/** Finds a workflow only when it belongs to the authenticated tenant. */
export async function getWorkflow(tenantId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    select: { id: true, tenantId: true, name: true, description: true, nodes: true, edges: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

/** Persists a validated workflow for one tenant. */
export async function createWorkflow(
  tenantId: string,
  input: CreateWorkflowInput,
  actorId?: string,
) {
  return prisma.$transaction(async (transaction) => {
    const workflow = await transaction.workflow.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        nodes: input.nodes as Prisma.InputJsonValue,
        edges: input.edges as Prisma.InputJsonValue,
        createdById: actorId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "WORKFLOW_CREATED",
        metadata: { workflowId: workflow.id, name: workflow.name },
      },
    });

    return workflow;
  });
}

/** Persisted outcome returned by the workflow execution engine. */
export interface WorkflowExecutionResult {
  executionId: string;
  status: "COMPLETED" | "FAILED";
  output: Record<string, Prisma.JsonValue>;
  error?: string;
}

/** Executes an active tenant workflow and appends an audit record. */
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
    const nodes = z.array(workflowNodeSchema).max(100).parse(workflow.nodes);
    const edges = z.array(workflowEdgeSchema).max(200).parse(workflow.edges);

    const startNode = nodes.find((n) => n.type === "start");
    if (!startNode) throw new Error("Workflow missing start node");

    const context: Record<string, Prisma.JsonValue> = { ...input.input };
    const visited = new Set<string>();
    let currentNode: WorkflowNode | undefined = startNode;

    while (currentNode !== undefined && currentNode.type !== "end") {
      const activeNode: WorkflowNode = currentNode;
      if (visited.has(activeNode.id)) throw new Error("Workflow cycle detected");
      visited.add(activeNode.id);

      if (activeNode.type === "task" || activeNode.type === "action") {
        const taskConfig: Record<string, Prisma.JsonValue> = activeNode.config;
        const assignVariable = taskConfig.assignVariable;
        if (typeof assignVariable === "string" && taskConfig.value !== undefined) {
          context[assignVariable] = taskConfig.value;
        }
      } else if (activeNode.type === "condition") {
        const conditionConfig: Record<string, Prisma.JsonValue> = activeNode.config;
        const variable: string | undefined =
          typeof conditionConfig.variable === "string" ? conditionConfig.variable : undefined;
        const conditionValue: Prisma.JsonValue | undefined = variable
          ? context[variable]
          : undefined;
        const outgoing = edges.filter((edge) => edge.source === activeNode.id);
        const match: WorkflowEdge | undefined =
          outgoing.find((edge) => {
            if (!edge.condition) return true;
            return String(conditionValue) === edge.condition;
          }) ?? outgoing[0];
        if (!match) throw new Error(`No outgoing edge from condition ${activeNode.id}`);
        currentNode = nodes.find((node) => node.id === match.target);
        if (currentNode === undefined) {
          throw new Error(`Workflow edge targets missing node ${match.target}`);
        }
        continue;
      }

      const outgoing = edges.find((edge) => edge.source === activeNode.id);
      if (!outgoing) {
        if (activeNode.type === "action") {
          currentNode = undefined;
          continue;
        }
        throw new Error(`No outgoing edge from node ${activeNode.id}`);
      }
      currentNode = nodes.find((node) => node.id === outgoing.target);
      if (currentNode === undefined) {
        throw new Error(`Workflow edge targets missing node ${outgoing.target}`);
      }
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
