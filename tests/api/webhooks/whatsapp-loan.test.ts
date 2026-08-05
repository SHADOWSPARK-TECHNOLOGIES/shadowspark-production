/**
 * Tests for the WhatsApp loan webhook signature validation.
 *
 * These test the validateTwilioSignature logic in isolation using
 * the same algorithm as the route.
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Replicated from the route so we can test the algorithm directly
function validateTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let validationString = url;
  for (const key of sortedKeys) {
    validationString += key + (params[key] ?? "");
  }

  const expectedSig = crypto
    .createHmac("sha1", authToken)
    .update(validationString)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(twilioSignature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

function buildValidSignature(
  authToken: string,
  url: string,
  params: Record<string, string>
): string {
  const sortedKeys = Object.keys(params).sort();
  let validationString = url;
  for (const key of sortedKeys) {
    validationString += key + (params[key] ?? "");
  }
  return crypto.createHmac("sha1", authToken).update(validationString).digest("base64");
}

const TEST_TOKEN = "test_auth_token_abc123";
const TEST_URL = "https://example.com/api/webhooks/whatsapp-loan";
const TEST_PARAMS = { From: "whatsapp:+2348012345678", Body: "Hello" };

describe("Twilio signature validation", () => {
  it("accepts a valid signature", () => {
    const sig = buildValidSignature(TEST_TOKEN, TEST_URL, TEST_PARAMS);
    expect(validateTwilioSignature(TEST_TOKEN, sig, TEST_URL, TEST_PARAMS)).toBe(true);
  });

  it("rejects a tampered body param", () => {
    const sig = buildValidSignature(TEST_TOKEN, TEST_URL, TEST_PARAMS);
    const tamperedParams = { ...TEST_PARAMS, Body: "Injected" };
    expect(validateTwilioSignature(TEST_TOKEN, sig, TEST_URL, tamperedParams)).toBe(false);
  });

  it("rejects a wrong auth token", () => {
    const sig = buildValidSignature(TEST_TOKEN, TEST_URL, TEST_PARAMS);
    expect(validateTwilioSignature("wrong_token", sig, TEST_URL, TEST_PARAMS)).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(validateTwilioSignature(TEST_TOKEN, "", TEST_URL, TEST_PARAMS)).toBe(false);
  });

  it("rejects a tampered URL", () => {
    const sig = buildValidSignature(TEST_TOKEN, TEST_URL, TEST_PARAMS);
    expect(
      validateTwilioSignature(TEST_TOKEN, sig, "https://attacker.com/hook", TEST_PARAMS)
    ).toBe(false);
  });

  it("parameter order does not affect result", () => {
    // Params in reverse order — sorted internally, same sig
    const reversedParams = { Body: "Hello", From: "whatsapp:+2348012345678" };
    const sig = buildValidSignature(TEST_TOKEN, TEST_URL, TEST_PARAMS);
    expect(validateTwilioSignature(TEST_TOKEN, sig, TEST_URL, reversedParams)).toBe(true);
  });
});
