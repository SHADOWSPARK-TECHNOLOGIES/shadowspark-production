/**
 * BVN (Bank Verification Number) identity check.
 *
 * Production: calls VerifyMe API (https://verifyme.ng)
 * Development / testing: returns deterministic mock data when KYC_MOCK=true
 *
 * Usage:
 *   const result = await verifyBVN("12345678901");
 *   if (result.verified) { ... }
 */

import { fintechConfig } from "@/lib/config/fintech";

export interface BvnVerificationResult {
  verified: boolean;
  bvnNumber: string;
  name?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  providerRef?: string;
  /** Raw provider payload for audit storage */
  raw?: Record<string, unknown>;
  error?: string;
}

// ── Mock ─────────────────────────────────────────────────────────────────────

function mockVerifyBVN(bvnNumber: string): BvnVerificationResult {
  // Simulate a failure for BVNs that start with "000"
  if (bvnNumber.startsWith("000")) {
    return {
      verified: false,
      bvnNumber,
      error: "BVN not found in mock database",
    };
  }

  return {
    verified: true,
    bvnNumber,
    name: "Mock Applicant Name",
    dateOfBirth: "1990-01-15",
    phoneNumber: "+2348000000000",
    providerRef: `mock-${bvnNumber}`,
    raw: { mock: true, bvn: bvnNumber },
  };
}

// ── Live ─────────────────────────────────────────────────────────────────────

interface VerifyMeResponse {
  requestSuccessful: boolean;
  responseBody?: {
    bvn?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber1?: string;
    [key: string]: unknown;
  };
  responseCode?: string;
  responseDescription?: string;
}

async function liveVerifyBVN(bvnNumber: string): Promise<BvnVerificationResult> {
  const { providerUrl, apiKey } = fintechConfig.kyc;

  if (!apiKey) {
    throw new Error("KYC_API_KEY is not set. Set KYC_MOCK=true for local development.");
  }

  const authHeader = "Bearer " + apiKey;
  const response = await fetch(`${providerUrl}/identities/bvn/${bvnNumber}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json()) as VerifyMeResponse;

  if (!response.ok || !data.requestSuccessful) {
    return {
      verified: false,
      bvnNumber,
      error: data.responseDescription ?? `HTTP ${response.status}`,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  const body = data.responseBody ?? {};
  const fullName = [body.firstName, body.middleName, body.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    verified: true,
    bvnNumber,
    name: fullName || undefined,
    dateOfBirth: body.dateOfBirth,
    phoneNumber: body.phoneNumber1,
    providerRef: data.responseCode,
    raw: data as unknown as Record<string, unknown>,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Verify a BVN number.
 * Returns mock data when `KYC_MOCK=true`, real VerifyMe data otherwise.
 *
 * @param bvnNumber - 11-digit Nigerian BVN
 */
export async function verifyBVN(bvnNumber: string): Promise<BvnVerificationResult> {
  const trimmed = bvnNumber.trim();

  if (!/^\d{11}$/.test(trimmed)) {
    return {
      verified: false,
      bvnNumber: trimmed,
      error: "Invalid BVN format. Must be exactly 11 digits.",
    };
  }

  if (fintechConfig.kyc.mock) {
    return mockVerifyBVN(trimmed);
  }

  return liveVerifyBVN(trimmed);
}
