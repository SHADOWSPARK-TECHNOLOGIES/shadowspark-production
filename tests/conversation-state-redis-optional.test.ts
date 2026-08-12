import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({ redis: null }));

describe("conversation state without Redis", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses a process-local TTL store instead of dereferencing a null client", async () => {
    const { loadConversationState, saveConversationState } = await import(
      "@/lib/conversation-state"
    );
    const record = {
      state: "NAME" as const,
      tenantId: "tenant-1",
      phone: "+2348000000000",
      loanApplicationId: "loan-1",
      data: { name: "Ada" },
      updatedAt: new Date().toISOString(),
    };

    await saveConversationState(record);

    await expect(
      loadConversationState({
        tenantId: record.tenantId,
        phone: record.phone,
        loanApplicationId: record.loanApplicationId,
      })
    ).resolves.toEqual(record);
  });
});
