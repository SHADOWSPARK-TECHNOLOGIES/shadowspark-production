import { NextResponse } from "next/server";
import { config } from "@/lib/config";

/** Passkeys are opt-in until crypto verify + RP/origin parity are proven. */
export function webauthnDisabledResponse() {
  return NextResponse.json(
    { error: "Passkeys are temporarily unavailable. Use password sign-in." },
    { status: 503 },
  );
}

export function assertWebauthnEnabled() {
  if (!config.features.webauthnEnabled) {
    return webauthnDisabledResponse();
  }
  return null;
}
