import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

export interface AuthResult {
  user: AuthUserResponse;
  token: string;
}

export function validateRegisterInput(payload: unknown): RegisterInput {
  return registerSchema.parse(payload);
}

export function validateLoginInput(payload: unknown): LoginInput {
  return loginSchema.parse(payload);
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: passwordHash,
      name: input.name,
      role: "ADMIN",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const token = await signAuthToken({
    sub: user.id,
    tenantId: user.id, // use userId as tenantId fallback
    email: user.email,
    role: user.role ?? "ADMIN",
  });

  return { user, token };
}

// Keep old name as alias for existing callers
export const registerTenantAdmin = registerUser;

export async function loginWithPassword(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, password: true, name: true, role: true },
  });

  if (!user?.password) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const matches = await bcrypt.compare(input.password, user.password);
  if (!matches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = await signAuthToken({
    sub: user.id,
    tenantId: user.id,
    email: user.email,
    role: user.role ?? "user",
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  };
}
