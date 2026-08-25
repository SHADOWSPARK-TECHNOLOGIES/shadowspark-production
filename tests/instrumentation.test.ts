import { afterEach, describe, expect, it, vi } from "vitest";

const validateEnv = vi.hoisted(() => vi.fn());

vi.mock("@/lib/config/validateEnv", () => ({ validateEnv }));
vi.mock("@/workers/crawl-worker", () => {
  throw new Error("crawl worker must not load without explicit opt-in");
});
vi.mock("@/workers/lead-worker", () => {
  throw new Error("lead worker must not load without explicit opt-in");
});
vi.mock("@/workers/nudge-worker", () => {
  throw new Error("nudge worker must not load without explicit opt-in");
});

describe("server instrumentation", () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalEnableInlineWorkers = process.env.ENABLE_INLINE_WORKERS;

  afterEach(() => {
    vi.resetModules();
    validateEnv.mockReset();
    if (originalRuntime === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = originalRuntime;
    if (originalEnableInlineWorkers === undefined) delete process.env.ENABLE_INLINE_WORKERS;
    else process.env.ENABLE_INLINE_WORKERS = originalEnableInlineWorkers;
  });

  it("does not load long-running workers unless explicitly enabled", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.ENABLE_INLINE_WORKERS;

    const { register } = await import("@/instrumentation");

    await expect(register()).resolves.toBeUndefined();
    expect(validateEnv).toHaveBeenCalledOnce();
  });
});
