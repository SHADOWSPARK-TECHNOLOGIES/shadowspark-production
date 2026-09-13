import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Node runtime configuration", () => {
  it("uses Node 24 consistently in local, container, package, and CI configuration", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe("24.x");
    expect(read(".nvmrc").trim()).toBe("24");
    expect(read("Dockerfile")).toMatch(/^FROM node:24-alpine AS base/m);

    for (const workflow of [
      ".github/workflows/typecheck.yml",
      ".github/workflows/github-coverage.yml",
      ".github/workflows/firecrawl.yml",
    ]) {
      expect(read(workflow)).toMatch(/node-version:\s*["']?24["']?/);
    }
  });
});
