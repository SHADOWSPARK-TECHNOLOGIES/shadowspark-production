import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    demo: { create: vi.fn() },
    lead: { update: vi.fn() },
    systemEvent: { create: vi.fn() },
  };

  return {
    transactionClient,
    transaction: vi.fn(
      (operation: (client: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient),
    ),
    findDemo: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    demo: { findUnique: mocks.findDemo },
  },
}));

import { scheduleDemoForLead } from "@/lib/demo-service";

describe("demo scheduling idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      (operation: (client: typeof mocks.transactionClient) => Promise<unknown>) =>
        operation(mocks.transactionClient),
    );
    mocks.transactionClient.demo.create.mockResolvedValue({
      id: "demo-1",
      leadId: "lead-1",
      slug: "demo-created",
    });
    mocks.transactionClient.lead.update.mockResolvedValue({ id: "lead-1" });
    mocks.transactionClient.systemEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("creates the demo and notification events atomically", async () => {
    const result = await scheduleDemoForLead("lead-1", "buyer@example.com");

    expect(result.success).toBe(true);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transactionClient.demo.create).toHaveBeenCalledTimes(1);
    expect(mocks.transactionClient.systemEvent.create).toHaveBeenCalledTimes(2);
  });

  it("returns the existing demo without repeating events after a retry", async () => {
    const existingDemo = {
      id: "demo-existing",
      leadId: "lead-1",
      slug: "demo-existing",
    };
    mocks.transaction.mockRejectedValueOnce({ code: "P2002" });
    mocks.findDemo.mockResolvedValueOnce(existingDemo);

    const result = await scheduleDemoForLead("lead-1", "buyer@example.com");

    expect(result).toEqual({
      success: true,
      demo: existingDemo,
      checkoutUrl: "http://localhost:3000/checkout?leadId=lead-1&plan=audit",
    });
    expect(mocks.transactionClient.systemEvent.create).not.toHaveBeenCalled();
  });
});
