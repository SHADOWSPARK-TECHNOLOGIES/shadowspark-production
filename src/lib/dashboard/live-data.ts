import { api } from '@/lib/api';

export interface LoanApplicationRecord {
  id: string;
  tenantId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string | null;
  loanPurpose?: string | null;
  loanAmount: string | number;
  status: string;
  rejectionReason?: string | null;
  assignedOfficerId?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    kycDocuments: number;
    repayments: number;
  };
}

export interface KycDocumentRecord {
  id: string;
  tenantId: string;
  loanApplicationId: string;
  type: string;
  status: string;
  rejectionReason?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  documentUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
  loanApplication: {
    id?: string;
    applicantName: string;
    applicantPhone: string;
    loanAmount: string | number;
    status?: string;
  };
}

export interface MessageConversationRecord {
  loanApplicationId: string;
  applicantName: string;
  applicantPhone: string;
  channel: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    status: string;
    content: string;
    createdAt: string;
  };
}

export interface MessageRecord {
  id: string;
  tenantId: string;
  loanApplicationId: string;
  channel: string;
  status: string;
  content: string;
  senderId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  companyName?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    loanApplications: number;
    kycDocuments: number;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchPendingKyc() {
  return api.get<KycDocumentRecord[]>('/api/proxy/v1/kyc/pending?limit=100');
}

export async function verifyKycDocument(
  kycId: string,
  payload: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string },
) {
  return api.post<{ kycDocument: KycDocumentRecord; loanStatusUpdated: boolean }>(
    `/api/proxy/v1/kyc/${kycId}/verify`,
    payload,
    { idempotencyKey: crypto.randomUUID() },
  );
}

export async function fetchMessageConversations() {
  return api.get<MessageConversationRecord[]>('/api/proxy/v1/messages/conversations');
}

export async function fetchMessages(params: {
  loanApplicationId: string;
  channel?: string;
}) {
  const query = new URLSearchParams({
    loanApplicationId: params.loanApplicationId,
    page: '1',
    limit: '100',
  });
  if (params.channel) {
    query.set('channel', params.channel);
  }

  return api.get<ApiListResponse<MessageRecord>>(`/api/proxy/v1/messages?${query.toString()}`);
}

export async function sendMessage(payload: {
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  to: string;
  body: string;
  mediaUrl?: string;
  loanApplicationId?: string;
  templateId?: string;
  variables?: Record<string, string>;
}) {
  return api.post<{ messageId: string; jobId: string; status: string }>(
    '/api/proxy/v1/messages/send',
    payload,
    { idempotencyKey: crypto.randomUUID() },
  );
}

export async function fetchLoans() {
  return api.get<ApiListResponse<LoanApplicationRecord>>('/api/proxy/v1/loans?limit=100&page=1&sortBy=createdAt&sortOrder=asc');
}

export async function fetchTenant() {
  return api.get<TenantRecord>('/api/proxy/v1/tenant');
}
