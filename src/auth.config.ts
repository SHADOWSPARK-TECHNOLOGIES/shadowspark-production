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
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    // The Credentials provider is declared here so NextAuth recognises the
    // provider in the middleware JWT-verification path.  The actual
    // `authorize` function (which needs Prisma + bcrypt) is overridden in
    // src/auth.ts — it will never be called from middleware.
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/finance") ||
        nextUrl.pathname.startsWith("/support");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.sub = user.id;
        if ("role" in user && user.role) {
          token.role = user.role as string;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Role is stored as a string in the JWT. The full auth.ts overrides
        // this callback with the Prisma Role enum cast. For the Edge-only
        // middleware path we cast through unknown to avoid importing the
        // Prisma Role enum (which pulls in Node.js modules).
        (session.user as unknown as Record<string, unknown>).role =
          token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
