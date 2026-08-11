import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tenant hint usage", () => {
  it("does not use x-tenant-slug in business route handlers", () => {
    const routeFiles = [
      "src/app/api/v1/loans/route.ts",
      "src/app/api/v1/loans/[id]/route.ts",
      "src/app/api/v1/loans/[id]/assign/route.ts",
      "src/app/api/v1/kyc/[id]/verify/route.ts",
      "src/app/api/v1/kyc/[id]/request-info/route.ts",
      "src/app/api/v1/messages/send/route.ts",
    ].map((relativePath) => join(process.cwd(), relativePath));

    for (const filePath of routeFiles) {
      const source = readFileSync(filePath, "utf8");
      expect(source.includes("x-tenant-slug")).toBe(false);
    }
  });
});
