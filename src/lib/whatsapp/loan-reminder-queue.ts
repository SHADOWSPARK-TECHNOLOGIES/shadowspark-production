import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const LOAN_REMINDER_QUEUE = "loan-reminders";

export type LoanReminderJobData = {
  applicationId: string;
  reminderId: string;
  phoneNumber: string;
  applicantName: string;
  /** "PAYMENT_DUE" | "OVERDUE" | "FINAL_NOTICE" */
  reminderType: string;
  /** Amount in kobo */
  amountKobo: number;
};

let _loanReminderQueue: Queue<LoanReminderJobData> | null = null;

export function getLoanReminderQueue(): Queue<LoanReminderJobData> {
  if (!_loanReminderQueue) {
    _loanReminderQueue = new Queue<LoanReminderJobData>(LOAN_REMINDER_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return _loanReminderQueue;
}

/**
 * Schedule a loan payment reminder to be sent at a specific time.
 *
 * @param data     - Job payload
 * @param sendAt   - When to deliver (Date). Defaults to immediately.
 */
export async function enqueueLoanReminder(
  data: LoanReminderJobData,
  sendAt?: Date
): Promise<void> {
  const delay = sendAt ? Math.max(0, sendAt.getTime() - Date.now()) : 0;
  await getLoanReminderQueue().add("send-reminder", data, { delay });
}
