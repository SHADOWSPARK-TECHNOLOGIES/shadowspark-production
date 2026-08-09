import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  scrape: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@mendable/firecrawl-js", () => ({
  default: vi.fn(() => ({
    scrape: mocks.scrape,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));
vi.mock("@/lib/api/auth-context", () => ({
  requireAuthContext: vi.fn().mockResolvedValue({
    ok: true,
    context: {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      email: "user@example.com",
    },
  }),
}));

import { POST } from "@/app/api/sniper/scrape/route";

describe("sniper scrape route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIRECRAWL_API_KEY = "fc-test";
    process.env.SNIPER_SCRAPE_API_KEY = "sniper-test-key";
  });

  it("returns extracted intelligence", async () => {
    mocks.scrape.mockResolvedValue({
      success: true,
      extract: {
        companyName: "Acme",
        founderNames: ["Ada"],
        coreProduct: "Platform",
        pricingTiers: ["Free"],
        contactEmails: ["hello@acme.com"],
      },
    });

    const response = await POST(
      new Request("http://localhost/api/sniper/scrape", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com" }),
        headers: {
          "content-type": "application/json",
          "x-api-key": "sniper-test-key",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        companyName: "Acme",
        founderNames: ["Ada"],
      },
    });
  });

  it("rejects missing targetUrl", async () => {
    const response = await POST(
      new Request("http://localhost/api/sniper/scrape", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          "x-api-key": "sniper-test-key",
        },
      })
    );

    expect(response.status).toBe(400);
  });
});
