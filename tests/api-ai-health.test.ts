import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/ai/health", () => {
  it("reports redis connected when ping succeeds", async () => {
    vi.doMock("@/lib/redis", () => ({
      redis: {
        ping: vi.fn().mockResolvedValue("PONG"),
      },
    }));

    const { GET } = await import("@/app/api/ai/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("active");
    expect(body.redis).toBe("connected");
  });

  it("reports redis disconnected when ping fails", async () => {
    vi.doMock("@/lib/redis", () => ({
      redis: {
        ping: vi.fn().mockRejectedValue(new Error("boom")),
      },
    }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("@/app/api/ai/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.redis).toBe("disconnected");
    expect(errorSpy).toHaveBeenCalled();
  });
});
