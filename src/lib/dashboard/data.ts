// ─── Dashboard Mock Data ───
// Replace these with real API calls when backend is ready

import type { Lead, AuditDomain, Finding, WhatsAppThread, ScoreDimension, BriefingItem, KpiCard, ActivityEvent } from './types';

export const KPI_CARDS: KpiCard[] = [
  { label: 'Total Leads', value: '147', delta: '↑ 18% this week', deltaType: 'up' },
  { label: 'Hot Leads', value: '23', delta: '↑ 5 new today', deltaType: 'up' },
  { label: 'MRR (USD)', value: '$4,197', delta: '↑ $349 MoM', deltaType: 'up' },
  { label: 'Compliance Score', value: '78%', delta: '→ 2 domains pending', deltaType: 'neutral' },
  { label: 'WhatsApp Sessions', value: '341', delta: '↑ 41 today', deltaType: 'up' },
  { label: 'Demos Booked', value: '3', delta: 'Real estate · Bank · Crypto', deltaType: 'neutral' },
];

export const LEADS: Lead[] = [
  { company: 'Lagos Real Estate Co.', sector: 'Real Estate', source: 'WhatsApp', status: 'hot', score: 91, date: '1 May 2026' },
  { company: 'Access Bank PHC', sector: 'Banking', source: 'Demo', status: 'hot', score: 88, date: '29 Apr 2026' },
  { company: 'Crypto Exchange NG', sector: 'Crypto', source: 'Referral', status: 'hot', score: 85, date: '28 Apr 2026' },
  { company: 'Zenith Logistics', sector: 'Logistics', source: 'WhatsApp', status: 'warm', score: 72, date: '27 Apr 2026' },
  { company: 'FirstMed Clinics', sector: 'Healthcare', source: 'LinkedIn', status: 'warm', score: 68, date: '25 Apr 2026' },
  { company: 'ShopKeeper PH', sector: 'Retail', source: 'WhatsApp', status: 'warm', score: 61, date: '24 Apr 2026' },
  { company: 'Oando Energy', sector: 'Energy', source: 'Cold Email', status: 'warm', score: 55, date: '22 Apr 2026' },
  { company: 'TechHub Enugu', sector: 'Tech', source: 'WhatsApp', status: 'cold', score: 38, date: '20 Apr 2026' },
];

export const AUDIT_DOMAINS: AuditDomain[] = [
  {
    name: 'Capital Adequacy (ISA 2025)',
    score: 82,
    color: 'var(--color-success)',
    criteria: [
      'Minimum capital threshold documented',
      'Board resolution on recapitalisation',
      'Capital adequacy ratio computed',
      'Statutory reserves maintained',
      'Annual capital verification submitted',
    ],
  },
  {
    name: 'AML / KYC Compliance',
    score: 91,
    color: 'var(--color-primary)',
    criteria: [
      'Customer due diligence procedures in place',
      'EDD for high-risk clients',
      'Suspicious transaction reporting active',
      'STR filed to NFIU',
      'Staff AML training completed',
    ],
  },
  {
    name: 'Data Governance (NDPA)',
    score: 65,
    color: 'var(--color-warning)',
    criteria: [
      'Privacy policy updated for NDPA 2023',
      'Data Protection Impact Assessment done',
      'Data controller registration active',
      'Breach response plan in place',
      'Third-party data sharing agreements signed',
    ],
  },
  {
    name: 'Tax Compliance (FIRS)',
    score: 78,
    color: 'var(--color-gold)',
    criteria: [
      '4% Development Levy computed',
      'CIT filing up to date',
      'WHT deductions remitted',
      'Transfer pricing documentation ready',
      'Annual tax returns filed',
    ],
  },
  {
    name: 'Market Conduct (SEC)',
    score: 58,
    color: 'var(--color-notification)',
    criteria: [
      'Licence renewal submitted',
      'Fee disclosures updated',
      'Client suitability assessments done',
      'Conflicts of interest register maintained',
      'Annual returns filed to SEC',
    ],
  },
];

export const FINDINGS: Finding[] = [
  { sev: 'critical', domain: 'Market Conduct', text: 'SEC licence renewal not yet submitted. Deadline: 30 June 2026. Immediate board action required.' },
  { sev: 'high', domain: 'Data Governance', text: 'NDPA Data Controller registration overdue. NITDA portal registration required within 30 days.' },
  { sev: 'medium', domain: 'Capital Adequacy', text: 'Recapitalisation plan board approval pending. SEC 6-week window closes 30 Apr 2026.' },
];

export const THREADS: WhatsAppThread[] = [
  { name: 'Access Bank PHC', avatar: 'A', preview: "When can we schedule the full demo?", time: '2 min ago', unread: 2 },
  { name: 'Lagos Real Estate Co.', avatar: 'L', preview: "What's the pricing for the ₦349 plan?", time: '18 min ago', unread: 1 },
  { name: 'FirstMed Clinics', avatar: 'F', preview: 'Do you support NHIS compliance tracking?', time: '1 hr ago', unread: 0 },
  { name: 'Zenith Logistics', avatar: 'Z', preview: 'Our WhatsApp number is +2348…', time: '3 hr ago', unread: 0 },
];

export const SCORE_DIMS: ScoreDimension[] = [
  { label: 'Industry Risk', key: 'risk', val: 80 },
  { label: 'Compliance Gap', key: 'compliance', val: 70 },
  { label: 'Revenue Potential', key: 'revenue', val: 85 },
  { label: 'Engagement Score', key: 'engagement', val: 65 },
  { label: 'Recency', key: 'recency', val: 75 },
];

export const BRIEFING_ITEMS: BriefingItem[] = [
  { sev: 'critical', reg: 'SEC', desc: 'Circular 26-1 enforcement — Recapitalisation plan deadline was 30 April 2026. All market operators must now submit compliance evidence or face sanctions.' },
  { sev: 'high', reg: 'CBN', desc: 'Bank recapitalisation complete. 30 banks confirmed compliant. Foreign currency transactions above $10,000 now require additional documentation.' },
  { sev: 'medium', reg: 'FIRS', desc: '4% Development Levy first quarterly payment due June 2026 for companies with FY end Dec 2025. Exemption claims for SMEs must be filed proactively.' },
  { sev: 'low', reg: 'SEC', desc: 'ISA 2025 secondary market regulations effective May 2026. Broker-dealers must update client risk profiling documentation.' },
];

export const ACTIVITY_EVENTS: ActivityEvent[] = [
  { dotColor: 'var(--color-success)', text: 'New lead captured via WhatsApp — <strong>Lagos Real Estate Co.</strong>', time: '2 min ago' },
  { dotColor: 'var(--color-primary)', text: 'Demo booked by <strong>Access Bank (Port Harcourt)</strong> — 7 May 2026', time: '14 min ago' },
  { dotColor: 'var(--color-warning)', text: 'Watchtower scan completed — 1 new SEC circular detected', time: '1 hr ago' },
  { dotColor: 'var(--color-success)', text: 'Paystack webhook — ₦522,000 settlement confirmed', time: '3 hr ago' },
];

export const WATCHTOWER_ALERTS: ActivityEvent[] = [
  { dotColor: 'var(--color-notification)', text: '<strong>SEC Circular 26-1</strong> — Non-bank custodian threshold raised to ₦50B. Review capital status.', time: 'Mon 28 Apr · 08:00 WAT' },
  { dotColor: 'var(--color-warning)', text: '<strong>CBN Recapitalisation</strong> — March 31 deadline passed. 33 banks completed raises. 3 clients affected.', time: 'Tue 1 Apr · 09:15 WAT' },
  { dotColor: 'var(--color-gold)', text: '<strong>FIRS 4% Dev Levy</strong> — Effective Jan 2026. Consolidated from 4 legacy levies. SME clients may be exempt.', time: 'Wed 2 Jan · 07:00 WAT' },
];

export const BOT_REPLIES = [
  "Got it! Let me pull the latest SEC circular data for you...",
  "Based on our RAG index, the ISA 2025 compliance deadline is June 30, 2027 for all market operators.",
  "Would you like to Book a Demo? I can schedule one directly in Calendly for you 📅",
  "Our $349/month plan includes the full Regulatory Watchtower + WhatsApp AI. Want details?",
  "I'll flag this to the ShadowSpark team. Stephen will follow up within 24 hours ✅",
];
