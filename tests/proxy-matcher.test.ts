import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("authentication proxy matcher", () => {
  it("runs only on protected application surfaces", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/proxy.ts"),
      "utf8",
    );

    for (const route of [
      "/dashboard/:path*",
      "/operator/:path*",
      "/admin/:path*",
      "/finance/:path*",
      "/support/:path*",
    ]) {
      expect(source).toContain(`"${route}"`);
    }

    expect(source).not.toContain("/((?!api|_next/static|_next/image|");
  });
});
