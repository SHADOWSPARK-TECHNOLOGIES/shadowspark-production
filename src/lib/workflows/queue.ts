import { Queue } from "bullmq";
import { dispatchQueueJob } from "@/lib/queue-dispatch";
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
  if (redis === null) {
    throw new Error("Redis is not configured for the workflow queue");
  }

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
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: WORKFLOW_QUEUE,
    jobName: "workflow.trigger",
    data,
    enqueue: () => getWorkflowQueue().add("workflow.trigger", data),
    runInline: async () => {
      const { processWorkflowTriggerJob } = await import("@/lib/workflows/trigger-processor");
      return processWorkflowTriggerJob(data);
    },
  });
}
