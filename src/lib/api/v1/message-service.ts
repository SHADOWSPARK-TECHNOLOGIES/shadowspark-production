// Message service — returns demo data until schema migration adds Message model
export interface ConversationRecord {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  channel: string;
  createdAt: string;
}

const DEMO_CONVERSATIONS: ConversationRecord[] = [
  { id: "conv_001", contactName: "Adaeze Okonkwo", contactPhone: "+2348012345678", channel: "WHATSAPP", lastMessage: "I have sent my ID document", unreadCount: 2, updatedAt: "2026-08-08T09:00:00Z" },
  { id: "conv_002", contactName: "Emeka Nwosu", contactPhone: "+2348023456789", channel: "SMS", lastMessage: "When will my loan be approved?", unreadCount: 1, updatedAt: "2026-08-08T08:30:00Z" },
  { id: "conv_003", contactName: "Fatima Bello", contactPhone: "+2348034567890", channel: "WHATSAPP", lastMessage: "Thank you for the update", unreadCount: 0, updatedAt: "2026-08-07T16:00:00Z" },
];

const DEMO_MESSAGES: MessageRecord[] = [
  { id: "msg_001", conversationId: "conv_001", direction: "INBOUND", content: "Hello, I want to apply for a loan", channel: "WHATSAPP", createdAt: "2026-08-08T08:55:00Z" },
  { id: "msg_002", conversationId: "conv_001", direction: "OUTBOUND", content: "Welcome! Please send your ID document.", channel: "WHATSAPP", createdAt: "2026-08-08T08:56:00Z" },
  { id: "msg_003", conversationId: "conv_001", direction: "INBOUND", content: "I have sent my ID document", channel: "WHATSAPP", createdAt: "2026-08-08T09:00:00Z" },
];

export async function listConversations(_tenantId: string): Promise<ConversationRecord[]> {
  return DEMO_CONVERSATIONS;
}

export async function listMessages(_tenantId: string, conversationId: string): Promise<MessageRecord[]> {
  return DEMO_MESSAGES.filter(m => m.conversationId === conversationId);
}

export async function sendMessage(_tenantId: string, _to: string, _channel: string, content: string): Promise<MessageRecord> {
  return { id: `msg_${Date.now()}`, conversationId: "conv_001", direction: "OUTBOUND", content, channel: "WHATSAPP", createdAt: new Date().toISOString() };
}
