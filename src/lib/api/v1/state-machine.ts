export const LOAN_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "KYC_PENDING",
  "KYC_VERIFIED",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "CLOSED",
  "DEFAULTED",
  "RESTRUCTURED",
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

const VALID_TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["KYC_PENDING", "APPROVED", "REJECTED"],
  KYC_PENDING: ["KYC_VERIFIED", "REJECTED"],
  KYC_VERIFIED: ["APPROVED", "REJECTED"],
  APPROVED: ["DISBURSED", "REJECTED"],
  REJECTED: [],
  DISBURSED: ["CLOSED", "DEFAULTED", "RESTRUCTURED"],
  CLOSED: [],
  DEFAULTED: ["RESTRUCTURED", "CLOSED"],
  RESTRUCTURED: ["CLOSED", "DEFAULTED"],
};

export function isValidLoanTransition(from: LoanStatus, to: LoanStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateLoanTransition(
  currentStatus: string,
  nextStatus: string,
): asserts nextStatus is LoanStatus {
  if (!LOAN_STATUSES.includes(nextStatus as LoanStatus)) {
    throw new Error(`INVALID_STATUS: ${nextStatus} is not a valid loan status`);
  }
  if (!LOAN_STATUSES.includes(currentStatus as LoanStatus)) {
    throw new Error(`INVALID_STATUS: ${currentStatus} is not a valid loan status`);
  }
  if (!isValidLoanTransition(currentStatus as LoanStatus, nextStatus as LoanStatus)) {
    throw new Error(
      `INVALID_TRANSITION: cannot move loan from ${currentStatus} to ${nextStatus}`,
    );
  }
}
