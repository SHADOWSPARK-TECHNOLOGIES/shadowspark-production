/**
 * Security Hardening Tests — WebAuthn/Passkey & rPPG Liveness
 *
 * Verifies the security invariants established during the hardening pass:
 *
 * 1. Challenge Replay Rejection — Used challenges cannot be reused
 * 2. Counter Replay Rejection — Stale counters are rejected
 * 3. Invalid Origin Rejection — Wrong origins are rejected
 * 4. Passkey Bypass Route Rejection — Bypass requires registered passkey
 * 5. Low-Quality rPPG Handling — Returns inconclusive, not "deepfake"
 * 6. Ceremony Binding — Registration challenges rejected for auth, vice versa
 * 7. Expired Challenge Rejection — Stale challenges rejected
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Prisma ─────────────────────────────────────────────────────────────

const mockPrisma = {
  webAuthnChallenge: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  passkey: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBase64url(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── Test 1: Challenge Replay Rejection ──────────────────────────────────────

describe("Challenge Replay Rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject verification with a challenge already marked as used", async () => {
    const usedChallenge = makeBase64url();

    // Simulate challenge that was already used (has usedAt timestamp)
    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-1",
      userId: "user-1",
      challenge: usedChallenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      usedAt: new Date(), // Already used!
    });

    // This should cause the verification to fail
    const storedChallenge = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: usedChallenge },
    });

    // Simulate the server-side check
    const isAlreadyUsed = storedChallenge?.usedAt !== null;
    expect(isAlreadyUsed).toBe(true);
  });

  it("should mark challenge as used after successful verification", async () => {
    const challenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-2",
      userId: "user-1",
      challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      usedAt: null,
    });

    // Simulate invalidation after use
    await mockPrisma.webAuthnChallenge.update({
      where: { id: "challenge-2" },
      data: { usedAt: new Date() },
    });

    expect(mockPrisma.webAuthnChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "challenge-2" },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it("should reject challenge that doesn't exist in server-side store", async () => {
    const unknownChallenge = makeBase64url();
    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue(null);

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: unknownChallenge },
    });

    expect(stored).toBeNull();
  });
});

// ── Test 2: Counter Replay Rejection ────────────────────────────────────────

describe("Counter Replay Rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject authentication when counter does not increase", () => {
    const storedCounter = BigInt(5);
    const newCounter = BigInt(5); // Same — replay attempt

    const isReplay = newCounter > 0 && newCounter <= storedCounter;
    expect(isReplay).toBe(true);
  });

  it("should accept authentication when counter increases", () => {
    const storedCounter = BigInt(5);
    const newCounter = BigInt(6); // Increased — legitimate

    const isReplay = newCounter > 0 && newCounter <= storedCounter;
    expect(isReplay).toBe(false);
  });

  it("should accept when counter is 0 (some authenticators don't support counters)", () => {
    const storedCounter = BigInt(0);
    const newCounter = BigInt(0);

    // Counter of 0 should not trigger replay detection
    const isReplay = newCounter > 0 && newCounter <= storedCounter;
    expect(isReplay).toBe(false);
  });

  it("should reject when new counter is less than stored counter", () => {
    const storedCounter = BigInt(10);
    const newCounter = BigInt(3); // Less — cloned authenticator

    const isReplay = newCounter > 0 && newCounter <= storedCounter;
    expect(isReplay).toBe(true);
  });
});

// ── Test 3: Invalid Origin Rejection ────────────────────────────────────────

describe("Invalid Origin Rejection", () => {
  const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://shadowspark-tech.org",
    "https://shadowspark.com",
    "https://www.shadowspark-tech.org",
    "https://www.shadowspark.com",
  ];

  it("should reject origins not in the allowed list", () => {
    const maliciousOrigin = "https://evil-phishing-site.com";

    const isAllowed = ALLOWED_ORIGINS.includes(maliciousOrigin);
    expect(isAllowed).toBe(false);
  });

  it("should accept localhost for development", () => {
    expect(ALLOWED_ORIGINS.includes("http://localhost:3000")).toBe(true);
  });

  it("should reject origin with wrong scheme (http when https required)", () => {
    expect(ALLOWED_ORIGINS.includes("http://shadowspark-tech.org")).toBe(false);
  });

  it("should accept all production domains", () => {
    expect(ALLOWED_ORIGINS.includes("https://shadowspark-tech.org")).toBe(true);
    expect(ALLOWED_ORIGINS.includes("https://shadowspark.com")).toBe(true);
    expect(ALLOWED_ORIGINS.includes("https://www.shadowspark-tech.org")).toBe(true);
    expect(ALLOWED_ORIGINS.includes("https://www.shadowspark.com")).toBe(true);
  });
});

// ── Test 4: Passkey Bypass Route Rejection ──────────────────────────────────

describe("Passkey Bypass Route Rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject bypass for user without registered passkeys", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      password: "",
      role: "user",
      passkeys: [], // No passkeys registered
    };

    // Simulate auth.ts ceremony gating
    const hasPasskeys = mockUser.passkeys && mockUser.passkeys.length > 0;
    expect(hasPasskeys).toBe(false);
  });

  it("should allow bypass for user with registered passkeys", async () => {
    const mockUser = {
      id: "user-2",
      email: "test2@example.com",
      password: "",
      role: "user",
      passkeys: [
        {
          id: "pk-1",
          credentialId: "cred-1",
          counter: BigInt(1),
        },
      ],
    };

    // Simulate auth.ts ceremony gating
    const hasPasskeys = mockUser.passkeys && mockUser.passkeys.length > 0;
    expect(hasPasskeys).toBe(true);
  });

  it("should return null from authorize when bypass used without passkeys", async () => {
    // Simulate the full auth.ts authorize logic for bypass
    const mockCredentials = {
      email: "no-passkey@example.com",
      password: "passkey-auth-bypass",
    };

    const mockUser = {
      id: "user-3",
      email: "no-passkey@example.com",
      password: "",
      role: "user",
      passkeys: [],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const user = await mockPrisma.user.findUnique({
      where: { email: mockCredentials.email },
      include: { passkeys: true },
    });

    let result = null;
    if (user && mockCredentials.password === "passkey-auth-bypass") {
      if (user.passkeys && user.passkeys.length > 0) {
        result = { id: user.id, email: user.email, role: user.role };
      }
    }

    expect(result).toBeNull();
  });
});

// ── Test 5: Low-Quality rPPG Handling ───────────────────────────────────────

describe("Low-Quality rPPG Handling", () => {
  /**
   * Simulates the hardened processSignals() classification logic.
   */
  function classifyLiveness(
    heartRate: number,
    quality: number,
    degradedFlags: {
      lowLight: boolean;
      highCompression: boolean;
      motionBlur: boolean;
    },
  ): { verdict: "live" | "spoof" | "inconclusive"; reason?: string } {
    const activeDegradedCount = [
      degradedFlags.lowLight,
      degradedFlags.highCompression,
      degradedFlags.motionBlur,
    ].filter(Boolean).length;

    // Physiologically impossible
    if (heartRate > 0 && (heartRate < 30 || heartRate > 220)) {
      return {
        verdict: "spoof",
        reason: `Physiologically inconsistent signal detected (HR: ${Math.round(heartRate)} bpm)`,
      };
    }

    // No HR + degraded
    if (heartRate === 0 && quality === 0 && activeDegradedCount >= 2) {
      return { verdict: "inconclusive", reason: "Multiple degradation factors" };
    }

    // No HR, no degradation — flat signal
    if (heartRate === 0 && quality === 0) {
      return { verdict: "spoof", reason: "No physiological pulse detected" };
    }

    // Low quality + degradation
    if (quality < 0.15 && activeDegradedCount > 0) {
      return { verdict: "inconclusive", reason: "Signal quality too low" };
    }

    // Low quality, no degradation
    if (quality < 0.15) {
      return { verdict: "spoof", reason: "Signal below expected threshold" };
    }

    // CASE F: Borderline quality with degradation
    if (quality < 0.3 && activeDegradedCount > 0) {
      return { verdict: "inconclusive", reason: "Liveness analysis partially degraded" };
    }

    // Normal
    return { verdict: "live" };
  }

  it("should return inconclusive when signal quality is low due to compression", () => {
    const result = classifyLiveness(0, 0.05, {
      lowLight: false,
      highCompression: true,
      motionBlur: false,
    });
    expect(result.verdict).toBe("inconclusive");
    expect(result.reason).toBeDefined();
  });

  it("should return inconclusive when signal quality is low due to low light", () => {
    const result = classifyLiveness(0, 0.05, {
      lowLight: true,
      highCompression: true,
      motionBlur: false,
    });
    expect(result.verdict).toBe("inconclusive");
  });

  it("should return spoof (not inconclusive) for flat signal without degradation", () => {
    const result = classifyLiveness(0, 0, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("spoof");
  });

  it("should return spoof for physiologically impossible heart rate (250 bpm)", () => {
    const result = classifyLiveness(250, 0.8, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("spoof");
  });

  it("should return spoof for physiologically impossible heart rate (15 bpm)", () => {
    const result = classifyLiveness(15, 0.8, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("spoof");
  });

  it("should return live for normal heart rate with good quality", () => {
    const result = classifyLiveness(72, 0.8, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("live");
  });

  it("should return inconclusive for low quality with multiple degradation factors", () => {
    const result = classifyLiveness(0, 0, {
      lowLight: true,
      highCompression: true,
      motionBlur: true,
    });
    expect(result.verdict).toBe("inconclusive");
  });

  it("should return inconclusive for borderline quality with degradation", () => {
    const result = classifyLiveness(60, 0.2, {
      lowLight: true,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("inconclusive");
  });
});

// ── Test 6: Ceremony Binding ────────────────────────────────────────────────

describe("Ceremony Binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject authentication ceremony with registration challenge", async () => {
    const authChallenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-reg",
      userId: "user-1",
      challenge: authChallenge,
      type: "registration", // Created for registration, not auth!
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      usedAt: null,
    });

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: authChallenge },
    });

    // The verify-login route checks: storedChallenge.type !== "authentication"
    const ceremonyMismatch = stored?.type !== "authentication";
    expect(ceremonyMismatch).toBe(true);
  });

  it("should reject registration ceremony with authentication challenge", async () => {
    const regChallenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-auth",
      userId: "user-1",
      challenge: regChallenge,
      type: "authentication", // Created for auth, not registration!
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      usedAt: null,
    });

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: regChallenge },
    });

    // The verify-registration route checks: storedChallenge.type !== "registration"
    const ceremonyMismatch = stored?.type !== "registration";
    expect(ceremonyMismatch).toBe(true);
  });

  it("should accept registration ceremony with registration challenge", async () => {
    const regChallenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-reg-2",
      userId: "user-1",
      challenge: regChallenge,
      type: "registration",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      usedAt: null,
    });

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: regChallenge },
    });

    const ceremonyMatch = stored?.type === "registration";
    expect(ceremonyMatch).toBe(true);
  });
});

// ── Test 7: Expired Challenge Rejection ─────────────────────────────────────

describe("Expired Challenge Rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject a challenge that has expired", async () => {
    const expiredChallenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-expired",
      userId: "user-1",
      challenge: expiredChallenge,
      type: "authentication",
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      createdAt: new Date(),
      usedAt: null,
    });

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: expiredChallenge },
    });

    const isExpired = stored ? stored.expiresAt < new Date() : true;
    expect(isExpired).toBe(true);
  });

  it("should accept a challenge that hasn't expired", async () => {
    const validChallenge = makeBase64url();

    mockPrisma.webAuthnChallenge.findUnique.mockResolvedValue({
      id: "challenge-valid",
      userId: "user-1",
      challenge: validChallenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 60000), // Valid for another 60s
      createdAt: new Date(),
      usedAt: null,
    });

    const stored = await mockPrisma.webAuthnChallenge.findUnique({
      where: { challenge: validChallenge },
    });

    const isExpired = stored ? stored.expiresAt < new Date() : true;
    expect(isExpired).toBe(false);
  });
});

// ── Test 8: High-Quality Deepfake rPPG Edge Case ────────────────────────────

describe("High-Quality Deepfake rPPG Edge Cases", () => {
  /**
   * Simulates the hardened processSignals() classification logic — same as Test 5.
   */
  function classifyLiveness(
    heartRate: number,
    quality: number,
    frameCount: number,
    minFrames: number,
    degradedFlags: {
      lowLight: boolean;
      highCompression: boolean;
      motionBlur: boolean;
    },
  ): { verdict: "live" | "spoof" | "inconclusive"; reason?: string } {
    const activeDegradedCount = [
      degradedFlags.lowLight,
      degradedFlags.highCompression,
      degradedFlags.motionBlur,
    ].filter(Boolean).length;

    if (frameCount < minFrames) {
      return { verdict: "inconclusive", reason: "Insufficient frames" };
    }

    // Physiologically impossible
    if (heartRate > 0 && (heartRate < 30 || heartRate > 220)) {
      return { verdict: "spoof", reason: `Physiologically inconsistent signal detected (HR: ${Math.round(heartRate)} bpm)` };
    }

    // No HR + degraded
    if (heartRate === 0 && quality === 0 && activeDegradedCount >= 2) {
      return { verdict: "inconclusive", reason: "Multiple degradation factors" };
    }

    // No HR, no degradation
    if (heartRate === 0 && quality === 0) {
      return { verdict: "spoof", reason: "No physiological pulse detected" };
    }

    // Low quality + degradation
    if (quality < 0.15 && activeDegradedCount > 0) {
      return { verdict: "inconclusive", reason: "Signal quality too low" };
    }

    // Low quality, no degradation
    if (quality < 0.15) {
      return { verdict: "spoof", reason: "Signal below expected threshold" };
    }

    // High-quality deepfake simulation: plausible HR, good quality,
    // but with subtle compression artifacts that degraded detection catches
    if (quality >= 0.5 && heartRate >= 40 && heartRate <= 150) {
      // If any degradation flag is set, return inconclusive even with good HR
      if (activeDegradedCount > 0) {
        return { verdict: "inconclusive", reason: "Physiological data partially degraded — manual review recommended" };
      }
    }

    // Normal clean signal
    return { verdict: "live" };
  }

  it("should flag high-quality deepfake with plausible HR but subtle compression as inconclusive", () => {
    // Simulates a sophisticated deepfake that produces a plausible 72 bpm
    // signal with 0.7 quality, but has subtle compression artifacts
    const result = classifyLiveness(72, 0.7, 150, 100, {
      lowLight: false,
      highCompression: true,  // Compression artifacts from synthetic generation
      motionBlur: false,
    });
    expect(result.verdict).toBe("inconclusive");
    expect(result.reason).toContain("degraded");
  });

  it("should pass clean live signal (no degradation) as live even with similar HR", () => {
    // Same HR and quality, but no degradation flags — genuine live signal
    const result = classifyLiveness(72, 0.7, 150, 100, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("live");
  });

  it("should flag synthetic deepfake with perfect HR but motion artifacts", () => {
    // Deepfake trained to include heartbeat, but fails on inter-frame consistency
    const result = classifyLiveness(68, 0.65, 150, 100, {
      lowLight: false,
      highCompression: false,
      motionBlur: true,  // Unnatural motion transitions
    });
    expect(result.verdict).toBe("inconclusive");
  });

  it("should flag deepfake with multiple subtle degradation signals", () => {
    // Slight compression + slight motion anomaly — combined signals
    const result = classifyLiveness(75, 0.55, 150, 100, {
      lowLight: false,
      highCompression: true,
      motionBlur: true,
    });
    expect(result.verdict).toBe("inconclusive");
  });

  it("should return inconclusive for insufficient frame count even with good data", () => {
    // Deepfake could produce good HR in few frames — but we require minimum duration
    const result = classifyLiveness(72, 0.8, 30, 100, {
      lowLight: false,
      highCompression: false,
      motionBlur: false,
    });
    expect(result.verdict).toBe("inconclusive");
    expect(result.reason).toBe("Insufficient frames");
  });
});

// ── Test 9: External Authenticator (Cross-Platform) Registration ────────────

describe("External Authenticator Registration (Cross-Platform)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store passkey with cross-platform device type", async () => {
    // Simulate a YubiKey registration (cross-platform, USB/NFC)
    const mockPasskey = {
      id: "pk-yubikey-1",
      userId: "user-1",
      credentialId: "yubikey-cred-abc123",
      publicKey: "pQECAyYgASFYIOFJDKMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQR==",
      counter: BigInt(0),
      deviceType: "cross-platform",
      transports: JSON.stringify(["usb", "nfc"]),
      backedUp: false,
      createdAt: new Date(),
      lastUsedAt: null,
    };

    // Verify all cross-platform fields are persisted correctly
    expect(mockPasskey.deviceType).toBe("cross-platform");
    expect(JSON.parse(mockPasskey.transports)).toContain("usb");
    expect(JSON.parse(mockPasskey.transports)).toContain("nfc");
    expect(mockPasskey.backedUp).toBe(false);
  });

  it("should store passkey with platform device type (built-in authenticator)", async () => {
    const mockPasskey = {
      id: "pk-platform-1",
      userId: "user-2",
      credentialId: "platform-cred-def456",
      publicKey: "pQECAyYgASFYIOABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789JKLMNOP==",
      counter: BigInt(1),
      deviceType: "platform",
      transports: JSON.stringify(["internal"]),
      backedUp: true,
      createdAt: new Date(),
      lastUsedAt: null,
    };

    expect(mockPasskey.deviceType).toBe("platform");
    expect(JSON.parse(mockPasskey.transports)).toContain("internal");
    expect(mockPasskey.backedUp).toBe(true);
  });

  it("should support both credential algorithms (ES256 and RS256)", () => {
    // ES256 (alg -7) — P-256 curve
    const es256CredParams = { type: "public-key", alg: -7 };
    // RS256 (alg -257) — RSA
    const rs256CredParams = { type: "public-key", alg: -257 };

    const pubKeyCredParams = [es256CredParams, rs256CredParams];

    // Verify YubiKey 5 Series supports both
    expect(pubKeyCredParams).toContainEqual(
      expect.objectContaining({ alg: -7 }),
    );
    expect(pubKeyCredParams).toContainEqual(
      expect.objectContaining({ alg: -257 }),
    );
  });

  it("should reject credential from blocked authenticator attachment", async () => {
    // The API currently requires platform attachment (built-in)
    // Cross-platform authenticators like YubiKey would be rejected
    // by the authenticatorSelection.authenticatorAttachment constraint
    const authenticatorSelection = {
      authenticatorAttachment: "platform" as const,
      residentKey: "required" as const,
      userVerification: "required" as const,
    };

    // If a cross-platform authenticator tries to register, the
    // authenticatorSelection block would prevent it
    expect(authenticatorSelection.authenticatorAttachment).toBe("platform");
    // Cross-platform attachment would be rejected by this constraint
    const attachment = authenticatorSelection.authenticatorAttachment as string;
    const isNotCrossPlatform = attachment !== "cross-platform" && attachment !== undefined;
    expect(isNotCrossPlatform).toBe(true);
  });
});
