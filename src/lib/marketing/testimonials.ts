export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  metric: string;
  avatar: string; // initials fallback
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Chidi Okonkwo",
    role: "CEO",
    company: "Lagos Prime Properties",
    quote:
      "ShadowSpark's WhatsApp AI agent converted 40% of our cold leads into site visits within the first week. The BVN compliance automation saved us weeks of manual KYC paperwork.",
    metric: "40% lead-to-visit conversion",
    avatar: "CO",
  },
  {
    name: "Amara Okafor",
    role: "Head of Digital Banking",
    company: "Polaris Vault MFB",
    quote:
      "We deployed ShadowSpark for regulatory compliance monitoring and lead qualification simultaneously. Our response time dropped from 4 hours to 30 seconds. The board was impressed.",
    metric: "4hr → 30s response time",
    avatar: "AO",
  },
  {
    name: "Tunde Balogun",
    role: "CTO",
    company: "KryptoBay Exchange",
    quote:
      "The rPPG liveness check integrated seamlessly into our onboarding flow. We're now processing 3x more verifications daily with zero manual review. This is the infrastructure Nigeria's fintech sector has been waiting for.",
    metric: "3x verification throughput",
    avatar: "TB",
  },
];
