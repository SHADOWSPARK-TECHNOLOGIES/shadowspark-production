import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateEnv } from "@/lib/config/validateEnv";

const managedKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "PAYMENTS_ENABLED",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_PUBLIC_KEY",
  "OAUTH_ENABLED",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "WHATSAPP_ENABLED",
  "WHATSAPP_API_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
] as const;

const originalValues = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of managedKeys) {
    originalValues.set(key, process.env[key]);
    delete process.env[key];
  }

  process.env.DATABASE_URL = "postgresql://local.invalid/shadowspark";
  process.env.AUTH_SECRET = "local-test-value-never-used-outside-tests";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of managedKeys) {
    const originalValue = originalValues.get(key);
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  }
  originalValues.clear();
});

describe("validateEnv", () => {
  it("rejects startup when AUTH_SECRET is missing without exposing another value", () => {
    delete process.env.AUTH_SECRET;
    process.env.PAYSTACK_SECRET_KEY = "must-not-appear-in-error-output";

    expect(validateEnv).toThrowError(/Missing required environment variables:[\s\S]*AUTH_SECRET/);

    try {
      validateEnv();
    } catch (error) {
      expect(String(error)).not.toContain("must-not-appear-in-error-output");
    }
  });

  it("does not require feature credentials while their features are disabled", () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it.each([
    ["PAYMENTS_ENABLED", "PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY"],
    ["OAUTH_ENABLED", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    ["WHATSAPP_ENABLED", "WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  ])("requires feature credentials when %s is enabled", (flag, firstKey, secondKey) => {
    process.env[flag] = "true";

    expect(validateEnv).toThrowError(new RegExp(`${firstKey}[\\s\\S]*${secondKey}`));
  });
});
