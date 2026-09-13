import { describe, expect, it, vi } from "vitest";

import { createAssistantLeadTools } from "@/lib/assistant/lead-tools";
import { hasExplicitDemoAcceptance } from "@/lib/assistant/request";

function execute(tool: unknown, input: unknown) {
  return (tool as { execute: (value: unknown, options: unknown) => unknown }).execute(
    input,
    { toolCallId: "test-call", messages: [] },
  );
}

describe("assistant lead tools", () => {
  it("recognizes an explicit scheduling request but not a refusal", () => {
    expect(
      hasExplicitDemoAcceptance([
        { role: "user", content: "Yes, please schedule the demo." },
      ]),
    ).toBe(true);
    expect(
      hasExplicitDemoAcceptance([
        { role: "user", content: "No, don't schedule the demo yet." },
      ]),
    ).toBe(false);

    for (const content of [
      "Never schedule the demo.",
      "I can't schedule the demo.",
      "Can you explain how I would schedule a demo?",
      "Cancel the demo scheduling request.",
      "I am not ready to book a call.",
    ]) {
      expect(
        hasExplicitDemoAcceptance([{ role: "user", content }]),
        content,
      ).toBe(false);
    }
  });

  it("will not schedule a demo before a lead is captured in the same request", async () => {
    const scheduleDemo = vi.fn();
    const tools = createAssistantLeadTools({
      captureLead: vi.fn(),
      scheduleDemo,
      demoAccepted: true,
    });

    await expect(execute(tools.scheduleDemo, {})).resolves.toEqual({
      success: false,
      error: "Capture the lead in this request before scheduling a demo.",
    });
    expect(scheduleDemo).not.toHaveBeenCalled();
  });

  it("requires explicit user acceptance before scheduling", async () => {
    const capturedLead = {
      id: "captured-lead",
      email: "buyer@example.com",
    };
    const scheduleDemo = vi.fn();
    const tools = createAssistantLeadTools({
      captureLead: vi.fn().mockResolvedValue({ success: true, lead: capturedLead }),
      scheduleDemo,
      demoAccepted: false,
    });

    await execute(tools.captureLead, { email: "buyer@example.com" });

    await expect(execute(tools.scheduleDemo, {})).resolves.toEqual({
      success: false,
      error: "The user must explicitly accept demo scheduling in their latest message.",
    });
    expect(scheduleDemo).not.toHaveBeenCalled();
  });

  it("uses only the request-local captured lead identity", async () => {
    const capturedLead = {
      id: "captured-lead",
      email: "buyer@example.com",
    };
    const scheduleDemo = vi.fn().mockResolvedValue({ success: true });
    const tools = createAssistantLeadTools({
      captureLead: vi.fn().mockResolvedValue({ success: true, lead: capturedLead }),
      scheduleDemo,
      demoAccepted: true,
    });

    await execute(tools.captureLead, { email: "buyer@example.com" });

    const scheduleSchema = (tools.scheduleDemo as {
      inputSchema: { safeParse(value: unknown): { success: boolean } };
    }).inputSchema;
    expect(scheduleSchema.safeParse({ leadId: "model-invented-lead" }).success).toBe(
      false,
    );

    await execute(tools.scheduleDemo, { leadId: "model-invented-lead" });

    expect(scheduleDemo).toHaveBeenCalledWith(
      "captured-lead",
      "buyer@example.com",
    );
  });

  it("schedules at most once within a request", async () => {
    const scheduled = { success: true, demoId: "demo-1" };
    const scheduleDemo = vi.fn().mockResolvedValue(scheduled);
    const tools = createAssistantLeadTools({
      captureLead: vi.fn().mockResolvedValue({
        success: true,
        lead: { id: "captured-lead", email: "buyer@example.com" },
      }),
      scheduleDemo,
      demoAccepted: true,
    });

    await execute(tools.captureLead, { email: "buyer@example.com" });

    await expect(execute(tools.scheduleDemo, {})).resolves.toBe(scheduled);
    await expect(execute(tools.scheduleDemo, {})).resolves.toBe(scheduled);
    expect(scheduleDemo).toHaveBeenCalledTimes(1);
  });
});
