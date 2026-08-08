import { signAuthToken, type AuthTokenPayload } from "@/lib/auth";

export async function createTestToken(payload?: Partial<AuthTokenPayload>): Promise<string> {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-32-bytes-long-abc123";
  return signAuthToken({
    sub: "user_test",
    tenantId: "tenant_test",
    role: "ADMIN",
    email: "test@shadowspark.tech",
    ...payload,
  });
}

export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
