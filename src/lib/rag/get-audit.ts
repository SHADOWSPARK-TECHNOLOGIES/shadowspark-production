import { fetchLatestAuditMarkdown } from "@/lib/gcs/fetch-audit";

export async function getLatestAudit(slug: string): Promise<string> {
  return fetchLatestAuditMarkdown(slug);
}
