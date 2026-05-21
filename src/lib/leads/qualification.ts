export function qualifyLead(lead: { leadScore?: number | null; intent?: string | null }) {
  if (!lead) return false;
  const score = lead.leadScore || 0;
  return score >= 50 && lead.intent !== "junk" && lead.intent !== "unknown";
}
