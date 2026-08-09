import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1),
  scopes: z.array(z.string().trim().min(1)).default([]),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  return `ssk_${randomBytes(32).toString("hex")}`;
}

export async function createApiKey(
  tenantId: string,
  input: CreateApiKeyInput,
  actorId?: string,
): Promise<{ id: string; name: string; key: string; last4: string; scopes: string[] }> {
  return prisma.$transaction(async (tx) => {
    const key = generateApiKey();
    const keyHash = hashKey(key);
    const last4 = key.slice(-4);

    const record = await tx.apiKey.create({
      data: {
        tenantId,
        name: input.name,
        keyHash,
        last4,
        scopes: input.scopes,
        createdById: actorId,
      },
      select: { id: true, name: true, scopes: true, last4: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        action: "API_KEY_CREATED",
        actorId,
        metadata: { apiKeyId: record.id, name: input.name, scopes: input.scopes, last4 },
      },
    });

    return { ...record, key };
  });
}

export async function listApiKeys(tenantId: string) {
  return prisma.apiKey.findMany({
    where: { tenantId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, name: true, last4: true, scopes: true, createdAt: true, updatedAt: true },
  });
}

export async function revokeApiKey(tenantId: string, apiKeyId: string, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.apiKey.findFirst({ where: { id: apiKeyId, tenantId } });
    if (!existing) return null;

    const updated = await tx.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
      select: { id: true, tenantId: true, name: true, last4: true, scopes: true, revokedAt: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        action: "API_KEY_REVOKED",
        actorId,
        metadata: { apiKeyId, name: existing.name },
      },
    });

    return updated;
  });
}
