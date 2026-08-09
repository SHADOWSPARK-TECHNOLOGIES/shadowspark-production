import { describe, expect, it } from "vitest";
import { KYC_OCR_QUEUE, enqueueKycOcrJob } from "@/lib/kyc/ocr-queue";

describe("KYC OCR queue", () => {
  it("uses the expected queue name and job type", () => {
    expect(KYC_OCR_QUEUE).toBe("kyc-ocr");
    expect(enqueueKycOcrJob).toBeTypeOf("function");
  });
});
