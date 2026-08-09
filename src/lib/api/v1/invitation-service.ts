import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const inviteUserSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateInviteToken(): string {
  return `inv_${randomBytes(32).toString("hex")}`;
}

export async function inviteUser(
  tenantId: string,
  input: InviteUserInput,
  actorId?: string,
): Promise<{ id: string; email: string; role: string; token: string }> {
  return prisma.$transaction(async (tx) => {
    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    const existing = await tx.invitation.findUnique({
      where: { tenantId_email: { tenantId, email: input.email } },
    });
    if (existing && !existing.revokedAt && !existing.acceptedAt) {
      throw new Error("INVITATION_ALREADY_PENDING");
    }

    const invitation = await tx.invitation.create({
      data: {
        tenantId,
        email: input.email,
        role: input.role,
        tokenHash,
        invitedById: actorId,
      },
      select: { id: true, email: true, role: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        action: "USER_INVITED",
        actorId,
        metadata: { invitationId: invitation.id, email: input.email, role: input.role },
      },
    });

    return { ...invitation, token };
  });
}

export async function listInvitations(tenantId: string) {
  return prisma.invitation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, email: true, role: true, invitedById: true, acceptedAt: true, revokedAt: true, createdAt: true },
  });
}

export async function revokeInvitation(tenantId: string, invitationId: string, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invitation.findFirst({ where: { id: invitationId, tenantId } });
    if (!existing) return null;

    const updated = await tx.invitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
      select: { id: true, tenantId: true, email: true, role: true, revokedAt: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        action: "INVITATION_REVOKED",
        actorId,
        metadata: { invitationId, email: existing.email },
      },
    });

    return updated;
  });
}
