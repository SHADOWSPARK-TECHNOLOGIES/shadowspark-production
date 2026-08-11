import { Queue } from "bullmq";
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
  return getLoanDisbursementQueue().add("send-disbursement-notification", data);
}
