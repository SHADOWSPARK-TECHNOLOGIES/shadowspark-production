import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/webhooks/whatsapp/route";

describe("POST /api/v1/webhooks/whatsapp", () => {
  it("normalizes inbound webhook payloads", async () => {
    const req = new Request("http://localhost/api/v1/webhooks/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "demo-tenant" },
      body: JSON.stringify({ id: "msg-1", from: "+2348000000000", to: "+2348111111111", text: "hello", media: [{ url: "https://example.com/doc.pdf" }] }),
    });

    const res = await POST(req as never);
    const payload = await res.json();

    expect(payload.data.channel).toBe("whatsapp");
    expect(payload.data.tenantId).toBe("demo-tenant");
    expect(payload.data.externalMessageId).toBe("msg-1");
  });
});
