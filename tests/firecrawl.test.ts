import { afterEach, describe, expect, it } from "vitest";

import { clearFirecrawlCache, getFirecrawlClient } from "@/lib/firecrawl";

describe("Firecrawl Helper", () => {
  const originalEnv = process.env;

  afterEach(() => {
    // Restore the environment and clear the singleton cache after each test
    process.env = { ...originalEnv };
    clearFirecrawlCache();
  });

  it("throws an error if FIRECRAWL_API_KEY is not set", () => {
    delete process.env.FIRECRAWL_API_KEY;
    expect(() => getFirecrawlClient()).toThrow(/Missing required env var: FIRECRAWL_API_KEY/);
  });

  it("initializes successfully when FIRECRAWL_API_KEY is present", () => {
    process.env.FIRECRAWL_API_KEY = "test_api_key_123";
    const client = getFirecrawlClient();
    expect(client).toBeDefined();
  });

  it("returns the cached instance on subsequent calls", () => {
    process.env.FIRECRAWL_API_KEY = "test_api_key_123";
    const client1 = getFirecrawlClient();
    const client2 = getFirecrawlClient();
    expect(client1).toBe(client2);
  });
});
