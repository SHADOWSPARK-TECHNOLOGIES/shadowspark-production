import { prisma } from "@/lib/prisma";
import { executeWorkflow, workflowNodeSchema } from "@/lib/api/v1/workflow-service";
import type { WorkflowTriggerJobData } from "@/lib/workflows/queue";
import { z } from "zod";

/** Executes active tenant workflows whose start-node trigger matches the job. */
export async function processWorkflowTriggerJob(data: WorkflowTriggerJobData) {
  const workflows = await prisma.workflow.findMany({
    where: { tenantId: data.tenantId, isActive: true },
    select: { id: true, nodes: true },
  });
  const matches = workflows.filter((workflow) => {
    const nodes = z.array(workflowNodeSchema).safeParse(workflow.nodes);
    if (!nodes.success) return false;
    const start = nodes.data.find((node) => node.type === "start");
    return start?.config.trigger === data.trigger;
  });

  const results = await Promise.all(
    matches.map((workflow) =>
      executeWorkflow(data.tenantId, workflow.id, {
        input: {
          trigger: data.trigger,
          entityType: data.entityType,
          entityId: data.entityId,
          ...(data.payload ?? {}),
        },
      })
    )
  );

  return { matched: matches.length, executed: results.filter(Boolean).length };
}
