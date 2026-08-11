import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
  companyName: z.string().trim().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function validateRegisterInput(payload: unknown) { return registerSchema.parse(payload); }
export function validateLoginInput(payload: unknown) { return loginSchema.parse(payload); }

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: input.email, password: passwordHash, name: input.name, role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });

    const tenant = await tx.tenant.create({
      data: { name: input.companyName ?? input.name, companyName: input.companyName ?? input.name },
      select: { id: true },
    });

    await tx.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role: "ADMIN" } });

    const token = await signAuthToken({ sub: user.id, tenantId: tenant.id, email: user.email, role: user.role ?? "ADMIN" });
    return { user, tenant: { id: tenant.id }, token };
  });
}

export const registerTenantAdmin = registerUser;

export async function loginWithPassword(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, password: true, name: true, role: true },
  });

  if (!user?.password) throw new Error("INVALID_CREDENTIALS");

  const matches = await bcrypt.compare(input.password, user.password);
  if (!matches) throw new Error("INVALID_CREDENTIALS");

  // Get tenant from membership
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
    orderBy: { tenantId: "asc" },
  });

  const tenantId = membership?.tenantId ?? user.id; // fallback for legacy users

  const token = await signAuthToken({ sub: user.id, tenantId, email: user.email, role: user.role ?? "user" });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
}
