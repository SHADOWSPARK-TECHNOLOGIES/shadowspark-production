import { describe, expect, it } from "vitest";

import { optionalEnv, requireEnv } from "@/lib/env";

describe("env helpers", () => {
  it("optionalEnv returns undefined for missing or blank values", () => {
    delete process.env.TEST_MISSING;
    process.env.TEST_BLANK = "   ";

    expect(optionalEnv("TEST_MISSING")).toBeUndefined();
    expect(optionalEnv("TEST_BLANK")).toBeUndefined();
  });

  it("requireEnv throws for missing values", () => {
    delete process.env.TEST_REQUIRED;
    expect(() => requireEnv("TEST_REQUIRED")).toThrow(/Missing required env var: TEST_REQUIRED/);
  });

  it("requireEnv trims values", () => {
    process.env.TEST_REQUIRED = "  ok  ";
    expect(requireEnv("TEST_REQUIRED")).toBe("ok");
  });
});

