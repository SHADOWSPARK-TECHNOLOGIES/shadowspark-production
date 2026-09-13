import { describe, expect, it, vi } from "vitest";

const queueAccess = vi.hoisted(() => ({ crawl: vi.fn(), leads: vi.fn() }));

vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/crawl/queue", () => ({
  crawlQueue: new Proxy({}, { get: queueAccess.crawl }),
}));
vi.mock("@/lib/leads/queue", () => ({
  leadSyncQueue: new Proxy({}, { get: queueAccess.leads }),
}));

import { GET } from "@/app/api/operator/queue-stats/route";

describe("queue statistics without Redis", () => {
  it("reports inline mode without touching BullMQ", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "inline",
      crawl: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      leads: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    });
    expect(queueAccess.crawl).not.toHaveBeenCalled();
    expect(queueAccess.leads).not.toHaveBeenCalled();
  });
});
