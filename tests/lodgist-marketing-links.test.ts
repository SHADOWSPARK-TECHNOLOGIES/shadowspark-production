import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LODGIST_URL = "https://lodgist.online";

const landingCtas = [
  "src/components/landing/Flagship.tsx",
  "src/components/landing/Footer.tsx",
  "src/components/landing/LiveDeployment.tsx",
];

describe("marketing Lodgist deep links", () => {
  it("points every landing CTA at the live Lodgist site", () => {
    for (const relativePath of landingCtas) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

      expect(source).toContain(`href="${LODGIST_URL}"`);
      expect(source).not.toContain("lodgist.com.ng");
      expect(source).not.toContain("lodgist.ng");
      expect(source).not.toMatch(/TODO:.*[Ll]odgist URL/);
      expect(source).not.toMatch(/TODO:.*confirm live URL/);
    }
  });
});
