// Loan service — returns demo data until schema migration adds LoanApplication model
export interface LoanApplicationRecord {
  id: string;
  applicantName: string;
  applicantPhone: string;
  loanAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoansPageResult {
  data: LoanApplicationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEMO_LOANS: LoanApplicationRecord[] = [
  { id: "loan_001", applicantName: "Adaeze Okonkwo", applicantPhone: "+2348012345678", loanAmount: 500000, status: "APPROVED", createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-02T08:00:00Z" },
  { id: "loan_002", applicantName: "Emeka Nwosu", applicantPhone: "+2348023456789", loanAmount: 250000, status: "KYC_PENDING", createdAt: "2026-08-03T14:00:00Z", updatedAt: "2026-08-03T14:00:00Z" },
  { id: "loan_003", applicantName: "Fatima Bello", applicantPhone: "+2348034567890", loanAmount: 750000, status: "DISBURSED", createdAt: "2026-07-28T09:00:00Z", updatedAt: "2026-08-01T12:00:00Z" },
  { id: "loan_004", applicantName: "Chukwudi Eze", applicantPhone: "+2348045678901", loanAmount: 1000000, status: "SUBMITTED", createdAt: "2026-08-07T16:00:00Z", updatedAt: "2026-08-07T16:00:00Z" },
  { id: "loan_005", applicantName: "Ngozi Adeyemi", applicantPhone: "+2348056789012", loanAmount: 300000, status: "KYC_VERIFIED", createdAt: "2026-08-05T11:00:00Z", updatedAt: "2026-08-06T09:00:00Z" },
];

export async function listLoans(_tenantId: string, page = 1, pageSize = 20): Promise<LoansPageResult> {
  const start = (page - 1) * pageSize;
  const data = DEMO_LOANS.slice(start, start + pageSize);
  return { data, total: DEMO_LOANS.length, page, pageSize, totalPages: Math.ceil(DEMO_LOANS.length / pageSize) };
}

export async function getLoanById(_tenantId: string, loanId: string): Promise<LoanApplicationRecord | null> {
  return DEMO_LOANS.find(l => l.id === loanId) ?? null;
}
