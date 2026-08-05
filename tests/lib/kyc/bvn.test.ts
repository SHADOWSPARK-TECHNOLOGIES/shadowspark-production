import { describe, it, expect, beforeEach } from "vitest";

// Enable mock mode for all tests
beforeEach(() => {
  process.env.KYC_MOCK = "true";
});

// Dynamic import so env is set before the module reads it
async function getBvn() {
  const mod = await import("@/lib/kyc/bvn");
  return mod.verifyBVN;
}

describe("verifyBVN — mock mode", () => {
  it("returns verified=true for a standard 11-digit BVN", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("12345678901");
    expect(result.verified).toBe(true);
    expect(result.bvnNumber).toBe("12345678901");
    expect(result.name).toBe("Mock Applicant Name");
    expect(result.dateOfBirth).toBe("1990-01-15");
    expect(result.providerRef).toBe("mock-12345678901");
  });

  it("returns verified=false for BVNs starting with 000", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("00012345678");
    expect(result.verified).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns error for BVNs shorter than 11 digits", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("1234");
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Invalid BVN format");
  });

  it("returns error for BVNs longer than 11 digits", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("123456789012");
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Invalid BVN format");
  });

  it("returns error for BVNs containing non-digits", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("1234567890A");
    expect(result.verified).toBe(false);
    expect(result.error).toContain("Invalid BVN format");
  });

  it("trims whitespace before validating", async () => {
    const verifyBVN = await getBvn();
    const result = await verifyBVN("  12345678901  ");
    expect(result.verified).toBe(true);
    expect(result.bvnNumber).toBe("12345678901");
  });
});
