import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const WORKFLOW_EXECUTION_QUEUE = "workflow-executions";

export type WorkflowExecutionJobData = {
  executionId: string;
  tenantId: string;
  workflowVersionId: string;
};

let workflowQueue: Queue<WorkflowExecutionJobData> | null = null;

export function getWorkflowExecutionQueue() {
  if (!workflowQueue) {
    workflowQueue = new Queue<WorkflowExecutionJobData>(WORKFLOW_EXECUTION_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return workflowQueue;
}

export async function enqueueWorkflowExecution(data: WorkflowExecutionJobData) {
  await getWorkflowExecutionQueue().add("execute-workflow", data, { jobId: `${data.executionId}:${data.workflowVersionId}` });
}
