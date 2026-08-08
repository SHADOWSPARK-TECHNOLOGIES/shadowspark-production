// KYC service — demo data shaped to match PendingKycBackendDocument in dashboard/src/lib/backend-api.ts
export interface KycDocumentRecord {
  id: string;
  tenantId: string;
  loanApplicationId: string;
  type: string;
  status: string;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  loanApplication: {
    applicantName: string;
    applicantPhone: string;
    loanAmount: number;
  };
}

const DEMO_KYC: KycDocumentRecord[] = [
  {
    id: "kyc_001", tenantId: "demo", loanApplicationId: "loan_001",
    type: "ID_DOCUMENT", status: "PENDING",
    fileUrl: "https://placehold.co/600x400/1e293b/94a3b8?text=National+ID",
    createdAt: "2026-08-07T10:00:00Z", updatedAt: "2026-08-07T10:00:00Z",
    loanApplication: { applicantName: "Adaeze Okonkwo", applicantPhone: "+2348012345678", loanAmount: 500000 },
  },
  {
    id: "kyc_002", tenantId: "demo", loanApplicationId: "loan_002",
    type: "SELFIE", status: "PENDING",
    fileUrl: "https://placehold.co/600x400/1e293b/94a3b8?text=Selfie",
    createdAt: "2026-08-07T12:00:00Z", updatedAt: "2026-08-07T12:00:00Z",
    loanApplication: { applicantName: "Emeka Nwosu", applicantPhone: "+2348023456789", loanAmount: 250000 },
  },
  {
    id: "kyc_003", tenantId: "demo", loanApplicationId: "loan_003",
    type: "ADDRESS_DOCUMENT", status: "VERIFIED",
    fileUrl: "https://placehold.co/600x400/1e293b/94a3b8?text=Utility+Bill",
    createdAt: "2026-08-06T09:00:00Z", updatedAt: "2026-08-07T08:00:00Z",
    loanApplication: { applicantName: "Fatima Bello", applicantPhone: "+2348034567890", loanAmount: 750000 },
  },
];

export async function getPendingKyc(_tenantId: string): Promise<KycDocumentRecord[]> {
  return DEMO_KYC.filter(k => k.status === "PENDING");
}

export async function verifyKycDocument(
  _tenantId: string,
  kycId: string,
  status: "VERIFIED" | "REJECTED",
  _reason?: string,
): Promise<KycDocumentRecord | null> {
  const doc = DEMO_KYC.find(k => k.id === kycId);
  if (doc) { doc.status = status; doc.updatedAt = new Date().toISOString(); }
  return doc ?? null;
}
