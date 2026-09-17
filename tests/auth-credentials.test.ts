import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const { findUnique, configureAuth } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  configureAuth: vi.fn<(config: NextAuthConfig) => Record<string, unknown>>(() => ({})),
}));

vi.mock("next-auth", () => ({ default: configureAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/referral", () => ({ assignReferralCode: vi.fn() }));

await import("@/auth");
const config = configureAuth.mock.calls[0][0];
const provider = config.providers.find(
  (entry) => typeof entry !== "function" && entry.id === "credentials",
) as unknown as CredentialsConfig & { options: CredentialsConfig };
// Auth.js merges the provider's supplied options into its defaults.
const authorize = provider.options.authorize;
const request = new Request("https://example.test/api/auth/callback/credentials");
const password = "synthetic-password-for-test";
const passwordHash = bcrypt.hashSync(password, 4);

beforeEach(() => findUnique.mockReset());

describe("credentials authentication", () => {
  it.each([passwordHash, ""])("rejects the static marker for a passkey owner", async (hash) => {
    findUnique.mockResolvedValue({
      id: "user-1", email: "user@example.test", role: "user", password: hash,
      passkeys: [{ id: "passkey-1" }],
    });
    expect(await authorize({ email: "user@example.test", password: "passkey-auth-bypass" }, request)).toBeNull();
  });

  it("accepts the actual password for a passkey owner", async () => {
    findUnique.mockResolvedValue({
      id: "user-1", email: "user@example.test", role: "user", password: passwordHash,
      passkeys: [{ id: "passkey-1" }],
    });
    expect(await authorize({ email: "user@example.test", password }, request)).toEqual({
      id: "user-1", email: "user@example.test", role: "user",
    });
  });

  it("rejects an incorrect password", async () => {
    findUnique.mockResolvedValue({ id: "user-1", password: passwordHash, passkeys: [] });
    expect(await authorize({ email: "user@example.test", password: "wrong" }, request)).toBeNull();
  });
});
