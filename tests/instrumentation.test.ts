import { describe, expect, it } from "vitest";

import { shouldStartWorkers } from "@/instrumentation";

describe("instrumentation worker gate", () => {
  it("keeps workers off unless they are explicitly enabled", () => {
    expect(shouldStartWorkers({ NEXT_RUNTIME: "nodejs" })).toBe(false);
  });

  it("starts workers only in the Node runtime when explicitly enabled", () => {
    expect(
      shouldStartWorkers({ NEXT_RUNTIME: "nodejs", WORKERS_ENABLED: "true" }),
    ).toBe(true);
    expect(
      shouldStartWorkers({ NEXT_RUNTIME: "edge", WORKERS_ENABLED: "true" }),
    ).toBe(false);
  });

  it("keeps workers off during a production build", () => {
    expect(
      shouldStartWorkers({
        NEXT_RUNTIME: "nodejs",
        NEXT_PHASE: "phase-production-build",
        WORKERS_ENABLED: "true",
      }),
    ).toBe(false);
  });
});
