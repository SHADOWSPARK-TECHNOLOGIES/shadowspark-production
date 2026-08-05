import { prisma } from "@/lib/prisma";
import { enqueueWorkflowExecution } from "@/lib/workflows/queue";
import type { WorkflowNode } from "@/lib/workflows/schema";

function nextNodeKeys(nodes: WorkflowNode[], nodeKey: string) {
  return nodes.find((node) => node.key === nodeKey)?.next ?? [];
}

export async function scheduleWorkflowExecution(executionId: string) {
  const execution = await prisma.workflowExecution.findUnique({ where: { id: executionId } });
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  await enqueueWorkflowExecution({ executionId: execution.id, tenantId: execution.tenantId, workflowVersionId: execution.workflowVersionId });
  await prisma.workflowEvent.create({ data: { workflowExecutionId: execution.id, eventType: "EXECUTION_SCHEDULED", message: "Execution queued" } });
  return execution;
}

export async function processWorkflowExecution(executionId: string) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflowVersion: true, nodeExecutions: true },
  });

  if (!execution) throw new Error("EXECUTION_NOT_FOUND");

  const schema = execution.workflowVersion.schema as { nodes?: WorkflowNode[] };
  const nodes = schema.nodes ?? [];
  const triggerNode = nodes.find((node) => node.type === "TRIGGER") ?? nodes[0];

  await prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: "RUNNING", startedAt: execution.startedAt ?? new Date() } });

  if (!triggerNode) {
    await prisma.workflowDeadLetter.create({ data: { workflowExecutionId: execution.id, reason: "NO_TRIGGER_NODE", payload: schema } });
    await prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: "FAILED", lastError: "NO_TRIGGER_NODE" } });
    return;
  }

  await upsertNodeExecution(execution.id, triggerNode.key, triggerNode.type, { trigger: execution.triggerId });

  const queue = [...nextNodeKeys(nodes, triggerNode.key)];
  while (queue.length > 0) {
    const nodeKey = queue.shift()!;
    const node = nodes.find((item) => item.key === nodeKey);
    if (!node) {
      await prisma.workflowDeadLetter.create({ data: { workflowExecutionId: execution.id, reason: "NODE_NOT_FOUND", payload: { nodeKey } } });
      continue;
    }

    await upsertNodeExecution(execution.id, node.key, node.type, { config: node.config });
    queue.push(...nextNodeKeys(nodes, node.key));
  }

  await prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  await prisma.workflowEvent.create({ data: { workflowExecutionId: execution.id, eventType: "EXECUTION_COMPLETED", message: "Workflow execution completed" } });
}

async function upsertNodeExecution(executionId: string, nodeKey: string, nodeType: string, input: Record<string, unknown>) {
  const idempotencyKey = `${executionId}:${nodeKey}`;
  return prisma.workflowNodeExecution.upsert({
    where: { idempotencyKey },
    update: {
      status: "COMPLETED",
      attemptCount: { increment: 1 },
      input,
      output: { acknowledged: true },
      startedAt: new Date(),
      completedAt: new Date(),
    },
    create: {
      workflowExecutionId: executionId,
      nodeKey,
      nodeType,
      idempotencyKey,
      status: "COMPLETED",
      attemptCount: 1,
      input,
      output: { acknowledged: true },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}
