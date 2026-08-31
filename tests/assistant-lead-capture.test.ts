import { describe, expect, it, vi } from "vitest";

import { createLeadCaptureService } from "@/lib/assistant/lead-capture";

describe("assistant lead capture", () => {
  it("captures VASP intent without invoking scoring or ledger behavior", async () => {
    const lead = {
      id: "lead-local",
      email: "buyer@example.com",
      phoneNumber: null,
      intent: "We need help with VASP capital compliance",
      metadata: { escrowAccountId: "private-ledger-reference" },
      paymentRef: "private-payment-reference",
      miniAuditData: { confidential: true },
    };
    const upsert = vi.fn().mockResolvedValue(lead);
    const createEvent = vi.fn().mockResolvedValue({ id: "event-1" });
    const captureLead = createLeadCaptureService({
      lead: { upsert },
      systemEvent: { create: createEvent },
    });

    const result = await captureLead({
      email: " BUYER@example.com ",
      intent: "We need help with VASP capital compliance",
      metadata: { campaign: "assistant" },
    });

    expect(result).toEqual({
      success: true,
      lead: { id: "lead-local", email: "buyer@example.com" },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { email: "buyer@example.com" },
      update: {
        email: "buyer@example.com",
        phoneNumber: undefined,
        intent: "We need help with VASP capital compliance",
        updatedAt: expect.any(Date),
      },
      create: {
        email: "buyer@example.com",
        phoneNumber: null,
        intent: "We need help with VASP capital compliance",
        status: "NEW",
        metadata: { campaign: "assistant", source: "assistant" },
      },
    });
    expect(createEvent).toHaveBeenCalledTimes(1);
  });

  it("requires an email address or phone number", async () => {
    const captureLead = createLeadCaptureService({
      lead: { upsert: vi.fn() },
      systemEvent: { create: vi.fn() },
    });

    await expect(captureLead({ intent: "Interested" })).rejects.toThrow(
      "Either email or phone number is required",
    );
  });
});
