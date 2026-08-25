import { describe, expect, it } from "vitest";

import { buildKycUploadPersistence } from "@/lib/kyc/persistence";

describe("KYC Prisma persistence contract", () => {
  it("maps an inbound Twilio upload to the current KYC schema", () => {
    expect(
      buildKycUploadPersistence({
        fileUrl: "https://example.com/id.jpg",
        messageSid: "SM123",
      })
    ).toEqual({
      fileUrl: "https://example.com/id.jpg",
      status: "PENDING",
      ocrData: {
        source: {
          provider: "TWILIO",
          messageSid: "SM123",
        },
      },
    });
  });
});
