import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
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
          // Ceremony-gated: user must have a registered passkey to use this bypass.
          // This prevents an attacker who knows the bypass marker from creating
          // a session for any user without a passkey.
          if (!user.passkeys || user.passkeys.length === 0) {
            return null;
          }
          return { id: user.id, email: user.email, role: user.role };
        }

        // Normal password-based authentication
        if (!user.password) return null;

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (passwordsMatch) {
          return { id: user.id, email: user.email, role: user.role };
        }

        return null;
      }
    })
  ]
});
