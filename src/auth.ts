import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assignReferralCode } from "@/lib/referral";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { passkeys: true },
        });

        if (!user) return null;

        // Passkey authentication bypass — the verify-login route
        // uses this special marker when WebAuthn verification succeeded.
        // SECURITY: Only allowed if the user has at least one verified passkey,
        // preventing arbitrary session creation via this bypass.
        if (credentials.password === "passkey-auth-bypass") {
          if (!user.passkeys || user.passkeys.length === 0) return null;
          return { id: user.id, email: user.email, role: user.role };
        }

        if (!user.password) return null;

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (passwordsMatch) {
          return { id: user.id, email: user.email, role: user.role };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Only handle OAuth sign-ins here (Credentials handled by authorize above)
      if (!account || account.type !== "oauth") return true;

      const email = user.email;
      if (!email) return false;

      const providerAccountId = String(account.providerAccountId);
      const provider = account.provider; // "github" | "google"

      // Find or create the user, then link the OAuth account
      let dbUser = await prisma.user.findUnique({ where: { email } });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email,
            name: user.name ?? null,
            // OAuth users have no password — empty string is a sentinel value
            // that will never match any bcrypt hash.
            password: "",
            role: "user",
          },
        });
        await assignReferralCode(dbUser.id);
      }

      // Link provider if not already linked
      const existing = await prisma.oAuthAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
      if (!existing) {
        await prisma.oAuthAccount.create({
          data: { userId: dbUser.id, provider, providerAccountId },
        });
      }

      // Mutate the user object so the jwt callback gets the correct DB id
      user.id = dbUser.id;
      (user as unknown as Record<string, unknown>).role = dbUser.role;

      return true;
    },
  },
});
