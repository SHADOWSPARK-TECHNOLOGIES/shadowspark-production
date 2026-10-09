/**
 * Edge-compatible NextAuth configuration.
 *
 * This file contains ONLY the parts of the auth config that are safe to run
 * in the Edge runtime (middleware). It deliberately excludes:
 *   - PrismaAdapter (uses node:fs, node:net)
 *   - bcryptjs (uses node:crypto internals)
 *   - Any direct database imports
 *
 * The full config (with Prisma + bcrypt) lives in src/auth.ts and is used
 * by server components and API routes that run in the Node.js runtime.
 *
 * Railway terminates TLS and forwards the public host. Auth.js does not
 * auto-detect Railway, so trustHost is set here for Railway and production.
 * Canonical URL order is AUTH_URL, then NEXTAUTH_URL, then the Railway
 * public domain. When none of those are set, Auth.js uses the forwarded host.
 */

import type { NextAuthConfig } from "next-auth";

const RAILWAY_RUNTIME_KEYS = [
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_ENVIRONMENT_NAME",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "RAILWAY_PUBLIC_DOMAIN",
  "RAILWAY_STATIC_URL",
] as const;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function originFromHost(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withScheme = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/$/, "");
}

export function shouldTrustAuthHost(env: NodeJS.ProcessEnv = process.env): boolean {
  const onRailway = RAILWAY_RUNTIME_KEYS.some((key) => Boolean(env[key]));
  return Boolean(env.AUTH_TRUST_HOST || onRailway || env.NODE_ENV === "production");
}

export function resolveAuthUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicit = firstNonEmpty(env.AUTH_URL, env.NEXTAUTH_URL);
  if (explicit) return explicit;
  return originFromHost(env.RAILWAY_PUBLIC_DOMAIN) ?? originFromHost(env.RAILWAY_STATIC_URL);
}

export function applyResolvedAuthUrl(env: NodeJS.ProcessEnv = process.env): void {
  if (firstNonEmpty(env.AUTH_URL, env.NEXTAUTH_URL)) return;
  const resolved = resolveAuthUrl(env);
  if (resolved) env.AUTH_URL = resolved;
}

applyResolvedAuthUrl();

export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET,
  trustHost: shouldTrustAuthHost(),
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/operator") ||
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/finance") ||
        nextUrl.pathname.startsWith("/support");

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.sub = user.id;
        if ("role" in user && user.role) {
          token.role = typeof user.role === "string" ? user.role.toLowerCase() : user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Role is normalized to lowercase string in session.
        (session.user as unknown as Record<string, unknown>).role =
          typeof token.role === "string" ? token.role.toLowerCase() : token.role;
      }
      return session;
    },

  },
  pages: {
    signIn: "/login",
  },
};
