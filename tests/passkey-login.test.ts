import { beforeEach, expect, it, vi } from "vitest";

const { prisma, signIn } = vi.hoisted(() => ({
  prisma: {
    webAuthnChallenge: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
    passkey: { update: vi.fn() },
  },
  signIn: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/auth", () => ({ signIn }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ success: true }) }));

import { POST } from "@/app/api/auth/verify-login/route";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.webAuthnChallenge.findUnique.mockResolvedValue({
    id: "challenge-1", challenge: "public-challenge", userId: "user-1",
    type: "authentication", expiresAt: new Date(Date.now() + 60000), usedAt: null,
  });
  prisma.user.findUnique.mockResolvedValue({
    id: "user-1", email: "user@example.test", name: "Test User", role: "user",
    passkeys: [{ id: "passkey-1", credentialId: "public-credential-id", counter: BigInt(0) }],
  });
});

it("fails closed for a fabricated assertion without proof of private-key possession", async () => {
  const response = await POST(new Request("https://example.test/api/auth/verify-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@example.test", challenge: "public-challenge",
      credential: {
        id: "public-credential-id",
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({
            challenge: "public-challenge", type: "webauthn.get", origin: "https://shadowspark-tech.org",
          })).toString("base64url"),
          signatureCounter: 0,
        },
      },
    }),
  }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Passkey sign-in is temporarily unavailable. Use password or OAuth sign-in." });
  expect(signIn).not.toHaveBeenCalled();
  expect(prisma.passkey.update).not.toHaveBeenCalled();
  expect(prisma.webAuthnChallenge.update).not.toHaveBeenCalled();
});
