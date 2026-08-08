// Message service — demo data shaped to match MessageConversationBackend in dashboard/src/lib/backend-api.ts
export interface ConversationRecord {
  loanApplicationId: string;
  applicantName: string;
  applicantPhone: string;
  channel: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: { id: string; status: string; content: string; createdAt: string };
}

export interface MessageRecord {
  id: string;
  tenantId: string;
  loanApplicationId: string;
  channel: string;
  status: string;
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  createdAt: string;
  updatedAt: string;
}

const DEMO_CONVERSATIONS: ConversationRecord[] = [
  {
    loanApplicationId: "loan_001", applicantName: "Adaeze Okonkwo", applicantPhone: "+2348012345678",
    channel: "WHATSAPP", updatedAt: "2026-08-08T09:00:00Z", unreadCount: 2,
    lastMessage: { id: "msg_003", status: "DELIVERED", content: "I have sent my ID document", createdAt: "2026-08-08T09:00:00Z" },
  },
  {
    loanApplicationId: "loan_002", applicantName: "Emeka Nwosu", applicantPhone: "+2348023456789",
    channel: "SMS", updatedAt: "2026-08-08T08:30:00Z", unreadCount: 1,
    lastMessage: { id: "msg_010", status: "DELIVERED", content: "When will my loan be approved?", createdAt: "2026-08-08T08:30:00Z" },
  },
  {
    loanApplicationId: "loan_003", applicantName: "Fatima Bello", applicantPhone: "+2348034567890",
    channel: "WHATSAPP", updatedAt: "2026-08-07T16:00:00Z", unreadCount: 0,
    lastMessage: { id: "msg_020", status: "READ", content: "Thank you for the update", createdAt: "2026-08-07T16:00:00Z" },
  },
];

const DEMO_MESSAGES: MessageRecord[] = [
  { id: "msg_001", tenantId: "demo", loanApplicationId: "loan_001", channel: "WHATSAPP", status: "DELIVERED", content: "Hello, I want to apply for a loan", direction: "INBOUND", createdAt: "2026-08-08T08:55:00Z", updatedAt: "2026-08-08T08:55:00Z" },
  { id: "msg_002", tenantId: "demo", loanApplicationId: "loan_001", channel: "WHATSAPP", status: "READ", content: "Welcome! Please send your ID document.", direction: "OUTBOUND", createdAt: "2026-08-08T08:56:00Z", updatedAt: "2026-08-08T08:56:00Z" },
  { id: "msg_003", tenantId: "demo", loanApplicationId: "loan_001", channel: "WHATSAPP", status: "DELIVERED", content: "I have sent my ID document", direction: "INBOUND", createdAt: "2026-08-08T09:00:00Z", updatedAt: "2026-08-08T09:00:00Z" },
];

export async function listConversations(_tenantId: string): Promise<ConversationRecord[]> {
  return DEMO_CONVERSATIONS;
}

export async function listMessages(_tenantId: string, loanApplicationId: string): Promise<MessageRecord[]> {
  return DEMO_MESSAGES.filter(m => m.loanApplicationId === loanApplicationId);
}

export async function sendMessage(_tenantId: string, to: string, channel: string, content: string): Promise<MessageRecord> {
  return { id: `msg_${Date.now()}`, tenantId: "demo", loanApplicationId: "loan_001", channel, status: "SENT", content, direction: "OUTBOUND", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
