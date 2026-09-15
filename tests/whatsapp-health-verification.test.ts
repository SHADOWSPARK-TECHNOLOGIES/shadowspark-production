import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/lib/redis", () => ({ redis: { info: vi.fn().mockResolvedValue("used_memory:1\nmaxmemory:100") } }));

import { GET } from "@/app/api/cron/health-check/route";

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "synthetic-cron-value");
  vi.stubEnv("SLACK_WEBHOOK_URL", "");
  vi.stubEnv("META_ACCESS_TOKEN", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const request = () => new Request("https://example.test/api/cron/health-check", {
  headers: { authorization: "Bearer synthetic-cron-value" },
});

it.each([undefined, "", "   "])("does not send a verification request without usable configuration", async (value) => {
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", value);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(request());
  expect((await response.json()).webhook).toBe("error");
  expect(fetcher).not.toHaveBeenCalled();
});

it("encodes special characters so the configured token cannot change challenge parameters", async () => {
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "synthetic&hub.challenge=wrong+#value");
  const fetcher = vi.fn(async (input: string) => {
    const url = new URL(input);
    expect(url.searchParams.get("hub.verify_token")).toBe("synthetic&hub.challenge=wrong+#value");
    expect(url.searchParams.getAll("hub.challenge")).toEqual(["health_check"]);
    return new Response("health_check");
  });
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(request());
  expect((await response.json()).webhook).toBe("ok");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
