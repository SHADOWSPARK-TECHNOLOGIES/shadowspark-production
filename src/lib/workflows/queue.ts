import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const WORKFLOW_QUEUE = "workflow-triggers";

export interface WorkflowTriggerJobData {
  tenantId: string;
  trigger: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}

let workflowQueueInstance: Queue<WorkflowTriggerJobData> | null = null;

function getWorkflowQueue(): Queue<WorkflowTriggerJobData> {
  if (!workflowQueueInstance) {
    workflowQueueInstance = new Queue<WorkflowTriggerJobData>(WORKFLOW_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return workflowQueueInstance;
}

export async function enqueueWorkflowTrigger(data: WorkflowTriggerJobData) {
  return getWorkflowQueue().add("workflow.trigger", data);
}
