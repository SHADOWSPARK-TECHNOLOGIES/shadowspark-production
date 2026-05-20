// ─── Dashboard Data Types ───

export interface Lead {
  company: string;
  sector: string;
  source: string;
  status: 'hot' | 'warm' | 'cold';
  score: number;
  date: string;
}

export interface AuditDomain {
  name: string;
  score: number;
  color: string;
  criteria: string[];
}

export interface Finding {
  sev: 'critical' | 'high' | 'medium' | 'low';
  domain: string;
  text: string;
}

export interface WhatsAppThread {
  name: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
}

export interface ScoreDimension {
  label: string;
  key: string;
  val: number;
}

export interface BriefingItem {
  sev: 'critical' | 'high' | 'medium' | 'low';
  reg: string;
  desc: string;
}

export interface KpiCard {
  label: string;
  value: string;
  delta: string;
  deltaType: 'up' | 'down' | 'neutral';
}

export interface ActivityEvent {
  dotColor: string;
  text: string;
  time: string;
}
