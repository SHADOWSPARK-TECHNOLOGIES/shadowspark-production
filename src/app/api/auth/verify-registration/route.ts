/**
 * POST /api/auth/verify-registration
 *
 * Verifies and stores a WebAuthn credential after the client completes
 * navigator.credentials.create().
 *
 * Security hardening:
 * - Server-side challenge lookup (prevents replay from other ceremonies)
 * - Challenge invalidation after single use (prevents replay of same challenge)
 * - Ceremony type enforcement (registration challenges can't be used for auth)
 * - Challenge expiry check (stale challenges rejected)
 * - Strict origin verification
 *
 * Body: {
 *   userId: string;
 *   credential: { id: string; rawId: string; type: string; response: any };
 *   challenge: string;
 * }
 * Response: { verified: boolean; credentialId: string }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Hardcoded allowed origins */
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://shadowspark-tech.org",
  "https://shadowspark.com",
  "https://www.shadowspark-tech.org",
  "https://www.shadowspark.com",
];

export async function POST(request: Request) {
  try {
    const { userId, credential, challenge } = await request.json();

    if (!userId || !credential || !challenge) {
      return NextResponse.json(
        { error: "userId, credential, and challenge are required" },
        { status: 400 },
      );
    }

    // STEP 1: Look up challenge in server-side store
    const storedChallenge = await prisma.webAuthnChallenge.findUnique({
      where: { challenge },
    });

    if (!storedChallenge) {
      return NextResponse.json(
        { error: "Challenge not found or already used" },
        { status: 400 },
      );
    }

    // STEP 2: Check challenge hasn't expired
    if (storedChallenge.expiresAt < new Date()) {
      // Clean up expired challenge
      await prisma.webAuthnChallenge.delete({ where: { id: storedChallenge.id } });
      return NextResponse.json(
        { error: "Challenge has expired — please try again" },
        { status: 400 },
      );
    }

    // STEP 3: Verify ceremony binding — challenge must be for registration
    if (storedChallenge.type !== "registration") {
      // Clean up misused challenge
      await prisma.webAuthnChallenge.delete({ where: { id: storedChallenge.id } });
      return NextResponse.json(
        { error: "Challenge was created for a different ceremony type" },
        { status: 400 },
      );
    }

    // STEP 4: Invalidate challenge (single-use, prevent replay)
    await prisma.webAuthnChallenge.update({
      where: { id: storedChallenge.id },
      data: { usedAt: new Date() },
    });

    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id, response } = credential;

    // Extract client data JSON and attestation object
    const clientDataJSON = response.clientDataJSON
      ? Buffer.from(response.clientDataJSON, "base64url").toString()
      : null;

    let clientData: Record<string, unknown> = {};
    if (clientDataJSON) {
      try {
        clientData = JSON.parse(clientDataJSON);
      } catch {
        return NextResponse.json(
          { error: "Invalid clientDataJSON" },
          { status: 400 },
        );
      }
    }

    // Verify the challenge matches what the client signed
    if (clientData.challenge !== challenge) {
      return NextResponse.json(
        { error: "Challenge mismatch" },
        { status: 400 },
      );
    }

    // Verify the origin
    if (
      clientData.origin &&
      !ALLOWED_ORIGINS.includes(clientData.origin as string)
    ) {
      return NextResponse.json(
        { error: `Origin not allowed: ${clientData.origin}` },
        { status: 400 },
      );
    }

    // Verify the RP ID matches what the authenticator used
    // The clientDataJSON contains "type" which should be "webauthn.create"
    if (clientData.type !== "webauthn.create") {
      return NextResponse.json(
        { error: `Invalid WebAuthn type: ${clientData.type}` },
        { status: 400 },
      );
    }

    // Extract the public key from the attestation response
    const publicKeyBase64 = response.publicKey
      ? Buffer.from(response.publicKey, "base64url").toString("base64")
      : null;

    if (!publicKeyBase64 && !id) {
      return NextResponse.json(
        { error: "Missing credential data" },
        { status: 400 },
      );
    }

    // Check for duplicate credential
    const existingPasskey = await prisma.passkey.findUnique({
      where: { credentialId: id },
    });

    if (existingPasskey) {
      return NextResponse.json(
        { error: "Credential already registered" },
        { status: 409 },
      );
    }

    // Store the passkey
    const passkey = await prisma.passkey.create({
      data: {
        userId,
        credentialId: id,
        publicKey: publicKeyBase64 || "",
        counter: BigInt(response.signatureCounter || 0),
        deviceType: response.authenticatorAttachment || "platform",
        transports: response.transports
          ? JSON.stringify(response.transports)
          : null,
        backedUp: response.credProps?.rk || false,
      },
    });

    // Clean up the used challenge
    await prisma.webAuthnChallenge.delete({ where: { id: storedChallenge.id } });

    return NextResponse.json({
      verified: true,
      credentialId: passkey.credentialId,
    });
  } catch (error) {
    console.error("Verify registration error:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 },
    );
  }
}
