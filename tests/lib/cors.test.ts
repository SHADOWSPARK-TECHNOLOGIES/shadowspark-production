import { describe, expect, it } from "vitest";

import { corsHeaders } from "@/lib/cors";

function headersFor(origin: string): Record<string, string> {
  return corsHeaders(new Request("https://app.shadowspark.tech/api/health", { headers: { origin } }));
}

describe("CORS origins", () => {
  it("allows the production app origin and local development", () => {
    expect(headersFor("https://app.shadowspark.tech")["Access-Control-Allow-Origin"]).toBe(
      "https://app.shadowspark.tech",
    );
    expect(headersFor("http://localhost:3000")["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects Vercel and Netlify origins, including deploy previews", () => {
    const rejected = [
      "https://shadowspark-dashboard.vercel.app",
      "https://shadowspark-production.vercel.app",
      "https://shadowspark-attacker.vercel.app",
      "https://shadowspark-production.netlify.app",
      "https://shadowspark-preview--shadowspark-production.netlify.app",
      "https://deploy-preview-12--shadowspark-production.netlify.app",
    ];

    for (const origin of rejected) {
      expect(headersFor(origin)["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headersFor(origin)["Access-Control-Allow-Credentials"]).toBeUndefined();
    }
  });
});
