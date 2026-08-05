import { describe, expect, it } from "vitest";
import { workflowDefinitionSchema } from "@/lib/workflows/schema";

describe("workflowDefinitionSchema", () => {
  it("accepts supported node types", () => {
    const parsed = workflowDefinitionSchema.parse({
      tenantId: "demo-tenant",
      key: "loan-intake",
      name: "Loan Intake",
      triggerType: "WHATSAPP_MESSAGE",
      nodes: [
        { key: "trigger", type: "TRIGGER", next: ["classify"] },
        { key: "classify", type: "AI_CLASSIFY", next: [] },
      ],
    });

    expect(parsed.nodes).toHaveLength(2);
  });

  it("rejects unsupported node types", () => {
    expect(() => workflowDefinitionSchema.parse({
      tenantId: "demo-tenant",
      key: "loan-intake",
      name: "Loan Intake",
      triggerType: "WHATSAPP_MESSAGE",
      nodes: [{ key: "script", type: "SCRIPT" }],
    })).toThrow();
  });
});
