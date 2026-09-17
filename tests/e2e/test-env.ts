import { vi } from "vitest";
import { signAuthToken, type AuthTokenPayload } from "@/lib/auth";

export const E2E_JWT_SECRET = "test-e2e-jwt-secret-at-least-32-chars-long-abc123!";
export const E2E_API_URL = "https://ai-assist.production.internal";
export const E2E_API_TOKEN = "ai-assist-server-token-super-secret";

export interface TenantRecord {
  id: string;
  name: string;
  companyName: string | null;
}

export interface MembershipRecord {
  userId: string;
  tenantId: string;
  role: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
}

// In-memory tables for tests
export const mockTenants = new Map<string, TenantRecord>([
  ["tenant-a", { id: "tenant-a", name: "acme-corp", companyName: "Acme Corp" }],
  ["tenant-b", { id: "tenant-b", name: "beta-fintech", companyName: "Beta Fintech" }],
]);

export const mockMemberships = new Map<string, MembershipRecord>([
  ["user-admin-a", { userId: "user-admin-a", tenantId: "tenant-a", role: "ADMIN" }],
  ["user-comp-b", { userId: "user-comp-b", tenantId: "tenant-b", role: "COMPLIANCE" }],
  ["user-viewer-a", { userId: "user-viewer-a", tenantId: "tenant-a", role: "VIEWER" }],
]);

export const mockUsers = new Map<string, UserRecord>([
  ["user-admin-a", { id: "user-admin-a", email: "admin@acme.test", name: "Admin A", role: "ADMIN" }],
  ["user-comp-b", { id: "user-comp-b", email: "comp@beta.test", name: "Compliance B", role: "COMPLIANCE" }],
  ["user-viewer-a", { id: "user-viewer-a", email: "viewer@acme.test", name: "Viewer A", role: "VIEWER" }],
  ["user-orphan", { id: "user-orphan", email: "orphan@test.com", name: "Orphan User", role: "USER" }],
]);

export async function createE2EToken(
  payload?: Partial<AuthTokenPayload>,
  expiresInSeconds = 60 * 60 * 24,
  secret = E2E_JWT_SECRET
): Promise<string> {
  process.env.JWT_SECRET = secret;
  return signAuthToken(
    {
      sub: "user-admin-a",
      tenantId: "tenant-a",
      role: "ADMIN",
      email: "admin@acme.test",
      ...payload,
    },
    expiresInSeconds
  );
}

export function setupE2EEnvironment() {
  vi.stubEnv("JWT_SECRET", E2E_JWT_SECRET);
  vi.stubEnv("AI_ASSIST_API_URL", E2E_API_URL);
  vi.stubEnv("AI_ASSIST_API_TOKEN", E2E_API_TOKEN);
  vi.stubEnv("AI_ASSIST_TIMEOUT_MS", "3000");
}
