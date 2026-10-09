import { describe, expect, it } from "vitest";

import { applyResolvedAuthUrl, authConfig, resolveAuthUrl, shouldTrustAuthHost } from "@/auth.config";

describe("Railway auth host trust", () => {
  it("trusts the host in production without Vercel or Netlify", () => {
    expect(
      shouldTrustAuthHost({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("trusts the host when Railway injects its runtime variables", () => {
    expect(
      shouldTrustAuthHost({
        NODE_ENV: "test",
        RAILWAY_ENVIRONMENT: "production",
        RAILWAY_PUBLIC_DOMAIN: "shadowspark-production.up.railway.app",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("trusts the host when AUTH_TRUST_HOST is set", () => {
    expect(
      shouldTrustAuthHost({
        NODE_ENV: "test",
        AUTH_TRUST_HOST: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("does not trust the host only because VERCEL or NETLIFY is set", () => {
    expect(
      shouldTrustAuthHost({
        NODE_ENV: "development",
        VERCEL: "1",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      shouldTrustAuthHost({
        NODE_ENV: "development",
        NETLIFY: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it("does not trust the host in local development", () => {
    expect(
      shouldTrustAuthHost({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it("wires trustHost from the same host check the app uses", () => {
    expect(authConfig.trustHost).toBe(shouldTrustAuthHost());
  });
});

describe("Railway auth URL resolution", () => {
  it("prefers AUTH_URL over NEXTAUTH_URL and the Railway domain", () => {
    expect(
      resolveAuthUrl({
        AUTH_URL: "https://auth.example.com",
        NEXTAUTH_URL: "https://next.example.com",
        RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
      } as NodeJS.ProcessEnv),
    ).toBe("https://auth.example.com");
  });

  it("uses NEXTAUTH_URL when AUTH_URL is unset", () => {
    expect(
      resolveAuthUrl({
        NEXTAUTH_URL: "https://next.example.com",
        RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
      } as NodeJS.ProcessEnv),
    ).toBe("https://next.example.com");
  });

  it("builds an https origin from RAILWAY_PUBLIC_DOMAIN", () => {
    expect(
      resolveAuthUrl({
        RAILWAY_PUBLIC_DOMAIN: "shadowspark-production.up.railway.app",
      } as NodeJS.ProcessEnv),
    ).toBe("https://shadowspark-production.up.railway.app");
  });

  it("keeps an explicit scheme on RAILWAY_PUBLIC_DOMAIN", () => {
    expect(
      resolveAuthUrl({
        RAILWAY_PUBLIC_DOMAIN: "https://shadowspark.tech",
      } as NodeJS.ProcessEnv),
    ).toBe("https://shadowspark.tech");
  });

  it("falls back to RAILWAY_STATIC_URL when the public domain is absent", () => {
    expect(
      resolveAuthUrl({
        RAILWAY_STATIC_URL: "https://shadowspark.up.railway.app",
      } as NodeJS.ProcessEnv),
    ).toBe("https://shadowspark.up.railway.app");
  });

  it("returns undefined so Auth.js can use the forwarded host", () => {
    expect(
      resolveAuthUrl({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toBeUndefined();
  });

  it("assigns AUTH_URL from the Railway public domain when no canonical URL is set", () => {
    const env = {
      RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
    } as NodeJS.ProcessEnv;

    applyResolvedAuthUrl(env);

    expect(env.AUTH_URL).toBe("https://app.up.railway.app");
  });

  it("does not overwrite AUTH_URL or NEXTAUTH_URL", () => {
    const explicit = {
      AUTH_URL: "https://auth.example.com",
      RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
    } as NodeJS.ProcessEnv;
    applyResolvedAuthUrl(explicit);
    expect(explicit.AUTH_URL).toBe("https://auth.example.com");

    const legacy = {
      NEXTAUTH_URL: "https://next.example.com",
      RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
    } as NodeJS.ProcessEnv;
    applyResolvedAuthUrl(legacy);
    expect(legacy.AUTH_URL).toBeUndefined();
    expect(legacy.NEXTAUTH_URL).toBe("https://next.example.com");
  });

  it("ignores Vercel and Netlify host variables", () => {
    expect(
      resolveAuthUrl({
        VERCEL_URL: "shadowspark.vercel.app",
        URL: "https://shadowspark-production.netlify.app",
        DEPLOY_PRIME_URL: "https://deploy-preview-1--shadowspark-production.netlify.app",
      } as NodeJS.ProcessEnv),
    ).toBeUndefined();
  });
});
