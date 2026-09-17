import { NextResponse } from "next/server";

/**
 * Passkey login is disabled until assertion signature verification and a secure
 * session handoff are implemented. Client-supplied ceremony fields alone do not
 * prove possession of a registered private key.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    { error: "Passkey sign-in is temporarily unavailable. Use password or OAuth sign-in." },
    { status: 503 },
  );
}
