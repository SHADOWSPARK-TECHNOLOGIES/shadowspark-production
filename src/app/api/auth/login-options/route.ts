/**
 * POST /api/auth/login-options
 *
 * Generates WebAuthn authentication options for passkey login.
 * Stores the challenge server-side with ceremony binding to prevent
 * replay attacks across different ceremonies.
 *
 * Body: { email: string }
 * Response: { options: PublicKeyCredentialRequestOptions; challenge: string; credentialIds: string[]; userId: string }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Hardcoded RP ID — DO NOT derive from Host header (spoofable) */
const RP_ID = process.env.WEBAUTHN_RP_ID || "shadowspark-tech.org";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "https://shadowspark-tech.org";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Validate origin
    const origin = request.headers.get("origin");
    if (origin && origin !== ORIGIN && origin !== "http://localhost:3000") {
      return NextResponse.json(
        { error: `Origin not allowed: ${origin}` },
        { status: 400 },
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { passkeys: true },
    });

    if (!user || user.passkeys.length === 0) {
      return NextResponse.json(
        { error: "No passkeys registered for this account" },
        { status: 404 },
      );
    }

    // Generate a random challenge
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = Buffer.from(challengeBytes).toString("base64url");

    // Store challenge server-side with ceremony binding and expiry
    // This prevents replay: the same challenge cannot be used for registration
    // or for a different user's authentication
    await prisma.webAuthnChallenge.create({
      data: {
        userId: user.id,
        challenge,
        type: "authentication",
        expiresAt: new Date(Date.now() + 60000), // 60-second expiry
      },
    });

    // Get credential IDs for allowCredentials
    const credentialIds = user.passkeys.map((pk) => pk.credentialId);

    // Build WebAuthn request options
    const options: Record<string, unknown> = {
      challenge,
      rpId: RP_ID,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: credentialIds.map((id) => ({
        id,
        type: "public-key",
        transports: ["internal", "hybrid", "usb", "ble", "nfc"],
      })),
    };

    return NextResponse.json({
      options,
      challenge,
      credentialIds,
      userId: user.id,
    });
  } catch (error) {
    console.error("Login options error:", error);
    return NextResponse.json(
      { error: "Failed to generate login options" },
      { status: 500 },
    );
  }
}
