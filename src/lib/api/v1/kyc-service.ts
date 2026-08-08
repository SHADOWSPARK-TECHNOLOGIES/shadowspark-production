// KYC service — returns demo data until schema migration adds KycDocument model
export interface KycDocumentRecord {
  id: string;
  applicantName: string;
  applicantPhone: string;
  type: string;
  status: string;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
}

const DEMO_KYC: KycDocumentRecord[] = [
  { id: "kyc_001", applicantName: "Adaeze Okonkwo", applicantPhone: "+2348012345678", type: "ID_DOCUMENT", status: "PENDING", documentUrl: "https://placehold.co/400x250/1e293b/94a3b8?text=ID+Document", createdAt: "2026-08-07T10:00:00Z", updatedAt: "2026-08-07T10:00:00Z" },
  { id: "kyc_002", applicantName: "Emeka Nwosu", applicantPhone: "+2348023456789", type: "SELFIE", status: "PENDING", documentUrl: "https://placehold.co/400x250/1e293b/94a3b8?text=Selfie", createdAt: "2026-08-07T12:00:00Z", updatedAt: "2026-08-07T12:00:00Z" },
  { id: "kyc_003", applicantName: "Fatima Bello", applicantPhone: "+2348034567890", type: "ADDRESS_DOCUMENT", status: "VERIFIED", documentUrl: "https://placehold.co/400x250/1e293b/94a3b8?text=Address+Doc", createdAt: "2026-08-06T09:00:00Z", updatedAt: "2026-08-07T08:00:00Z" },
];

export async function getPendingKyc(_tenantId: string): Promise<KycDocumentRecord[]> {
  return DEMO_KYC.filter(k => k.status === "PENDING");
}

export async function verifyKycDocument(_tenantId: string, kycId: string, status: "VERIFIED" | "REJECTED", _reason?: string): Promise<KycDocumentRecord | null> {
  const doc = DEMO_KYC.find(k => k.id === kycId);
  if (doc) doc.status = status;
  return doc ?? null;
}
