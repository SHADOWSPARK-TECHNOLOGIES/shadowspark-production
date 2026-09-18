/**
 * Edge-compatible NextAuth configuration.
 *
 * This file contains ONLY the parts of the auth config that are safe to run
 * in Vercel's Edge Runtime (middleware). It deliberately excludes:
 *   - PrismaAdapter (uses node:fs, node:net)
 *   - bcryptjs (uses node:crypto internals)
 *   - Any direct database imports
 *
 * The full config (with Prisma + bcrypt) lives in src/auth.ts and is used
 * by server components and API routes that run in the Node.js runtime.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET,
  trustHost: Boolean(
    process.env.AUTH_TRUST_HOST ||
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.NODE_ENV === "production"
  ),
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
