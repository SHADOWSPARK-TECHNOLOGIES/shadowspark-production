import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUserResponse {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
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

function toUserResponse(user: {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
}): AuthUserResponse {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export async function registerTenantAdmin(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.companyName,
        companyName: input.companyName,
      },
      select: { id: true },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        password: passwordHash,
        role: "ADMIN",
        firstName: input.firstName,
        lastName: input.lastName,
        name: `${input.firstName} ${input.lastName}`.trim(),
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return user;
  });

  const token = await signAuthToken({
    sub: created.id,
    tenantId: created.tenantId,
    email: created.email,
    role: created.role ?? "ADMIN",
  });

  return {
    user: toUserResponse(created),
    token,
  };
}

export async function loginWithPassword(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      tenantId: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
    },
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
    tenantId: user.tenantId,
    email: user.email,
    role: user.role ?? "user",
  });

  return {
    user: toUserResponse(user),
    token,
  };
}
