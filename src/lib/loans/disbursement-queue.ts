import { Queue } from "bullmq";
import { dispatchQueueJob } from "@/lib/queue-dispatch";
import { redis } from "@/lib/redis";

export const LOAN_DISBURSEMENT_QUEUE = "loan-disbursement-notifications";

export interface LoanDisbursementJobData {
  tenantId: string;
  loanApplicationId: string;
  applicantName: string;
  applicantPhone: string;
  amount: string;
}

let queueInstance: Queue<LoanDisbursementJobData> | null = null;

function getLoanDisbursementQueue(): Queue<LoanDisbursementJobData> {
  if (redis === null) {
    throw new Error("Redis is not configured for the loan disbursement queue");
  }

  if (!queueInstance) {
    queueInstance = new Queue<LoanDisbursementJobData>(LOAN_DISBURSEMENT_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return queueInstance;
}

export async function enqueueLoanDisbursementNotification(data: LoanDisbursementJobData) {
  return dispatchQueueJob({
    redisAvailable: redis !== null,
    queueName: LOAN_DISBURSEMENT_QUEUE,
    jobName: "send-disbursement-notification",
    data,
    enqueue: () => getLoanDisbursementQueue().add("send-disbursement-notification", data),
    runInline: async () => {
      const { processLoanDisbursementNotification } = await import(
        "@/lib/loans/disbursement-processor"
      );
      return processLoanDisbursementNotification(data);
    },
  });
}
