/**
 * Shared PII redaction utilities for safe logging and audit telemetry.
 */

export function redactPhone(phone?: string | null): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "****";
  return "****" + trimmed.slice(-4);
}

export function redactEmail(email?: string | null): string {
  if (!email) return "";
  const trimmed = email.trim();
  const [user, domain] = trimmed.split("@");
  if (!domain) return "****";
  const maskedUser = user.length <= 2 ? `${user.slice(0, 1)}***` : `${user.slice(0, 2)}***`;
  return `${maskedUser}@${domain}`;
}
