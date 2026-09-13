import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { assertWorkerServiceEnabled } from "@/workers/runtime";

describe("dedicated worker runtime", () => {
  it("refuses to start unless the service is explicitly enabled", () => {
    expect(() => assertWorkerServiceEnabled({})).toThrowError(
      /WORKERS_ENABLED=true/,
    );
    expect(() =>
      assertWorkerServiceEnabled({ WORKERS_ENABLED: "false" }),
    ).toThrowError(/WORKERS_ENABLED=true/);
  });

  it("accepts an explicitly enabled worker service", () => {
    expect(() =>
      assertWorkerServiceEnabled({ WORKERS_ENABLED: "true" }),
    ).not.toThrow();
  });

  it("provides a dedicated worker command without starting workers in the web container", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );

    expect(packageJson.scripts["worker:all"]).toBe(
      "tsx src/workers/all.ts",
    );
    expect(dockerfile).toMatch(/CMD \["pnpm", "start"\]/);
    expect(dockerfile).not.toMatch(/worker:crawl|worker:lead|worker:all/);
  });
});
