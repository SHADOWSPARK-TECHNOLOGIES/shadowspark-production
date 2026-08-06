interface Lead {
  id: string;
  phoneNumber: string;
  email?: string | null;
  intent?: string | null;
  status: string;
  leadScore?: number | null;
  lastMessage?: string | null;
  nextFollowUpAt?: Date | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
