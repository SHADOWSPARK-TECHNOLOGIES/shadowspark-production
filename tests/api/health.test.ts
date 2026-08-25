import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
const unavailableRedis = vi.hoisted(
  () =>
    new Proxy(
      {},
      {
        get() {
          throw new Error("REDIS_URL is required");
        },
      }
    )
);

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: queryRaw },
}));
vi.mock("@/lib/redis", () => ({ redis: unavailableRedis }));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0 }]);
  });

  it("reports optional Redis as not configured while confirming Neon", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      vectorCount: 0,
      services: {
        database: "connected",
        redis: "not_configured",
      },
    });
  });
});
