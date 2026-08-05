import { prisma } from "@/lib/prisma";
import { enqueueWorkflowExecution } from "@/lib/workflows/queue";

export async function scheduleWorkflowExecution(executionId: string) {
  const execution = await prisma.workflowExecution.findUnique({ where: { id: executionId } });
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  await enqueueWorkflowExecution({ executionId: execution.id, tenantId: execution.tenantId, workflowVersionId: execution.workflowVersionId });
  await prisma.workflowEvent.create({ data: { workflowExecutionId: execution.id, eventType: "EXECUTION_SCHEDULED", message: "Execution queued" } });
  return execution;
}
