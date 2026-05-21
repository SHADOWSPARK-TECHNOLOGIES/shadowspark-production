/**
 * POST /api/auth/register-options
 *
 * Generates WebAuthn credential creation options for passkey registration.
 * Stores the challenge server-side with ceremony binding to prevent
 * replay attacks across different ceremonies.
 *
 * Body: { email: string; name?: string }
 * Response: { options: PublicKeyCredentialCreationOptions; challenge: string; userId: string }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

/** Hardcoded RP ID — DO NOT derive from Host header (spoofable) */
const RP_ID = process.env.WEBAUTHN_RP_ID || "shadowspark-tech.org";
const RP_NAME = "ShadowSpark Technologies";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "https://shadowspark-tech.org";

const registerOptionsSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1).max(256).optional(),
});

export async function POST(request: Request) {
  try {
    const { success: allowed, headers: rateLimitHeaders } = await rateLimit(
      request,
      "auth:register-options",
      5,
      "10 s",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders },
      );
    }

    const body = await request.json();
    const parsed = registerOptionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, name } = parsed.data;

    // Validate origin
    const origin = request.headers.get("origin");
    if (origin && origin !== ORIGIN && origin !== "http://localhost:3000") {
      return NextResponse.json(
        { error: `Origin not allowed: ${origin}` },
        { status: 400 },
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    // If this is a first-time user, create the account record
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: "", // Passkey users don't need a password
          role: "user",
        },
      });
    }

    // Generate a random challenge
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = Buffer.from(challengeBytes).toString("base64url");

    // Generate a user ID
    const userIdBytes = new TextEncoder().encode(user.id);
    const userId = Buffer.from(userIdBytes).toString("base64url");

    // Store challenge server-side with ceremony binding and expiry
    // This prevents replay: the same challenge cannot be used for authentication
    // or for a different user's registration
    await prisma.webAuthnChallenge.create({
      data: {
        userId: user.id,
        challenge,
        type: "registration",
        expiresAt: new Date(Date.now() + 60000), // 60-second expiry
      },
    });

    // Build WebAuthn creation options
    const options = {
      challenge,
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        id: userId,
        name: email,
        displayName: name || email.split("@")[0],
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 },  // RS256
      ],
      timeout: 60000,
      attestation: "none" as PublicKeyCredentialCreationOptions["attestation"],
      authenticatorSelection: {
        authenticatorAttachment: "platform" as AuthenticatorSelectionCriteria["authenticatorAttachment"],
        residentKey: "required" as ResidentKeyRequirement,
        userVerification: "required" as UserVerificationRequirement,
      },
      excludeCredentials: [],
    };

    return NextResponse.json({ options, challenge, userId: user.id });
  } catch (error) {
    console.error("Register options error:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 },
    );
  }
}
