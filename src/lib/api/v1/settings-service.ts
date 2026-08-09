import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const updateSettingsSchema = z.object({
  category: z.string().trim().min(1),
  key: z.string().trim().min(1),
  oldValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function updateSettings(
  tenantId: string,
  input: UpdateSettingsInput,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const change = await tx.settingsChange.create({
      data: {
        tenantId,
        category: input.category,
        key: input.key,
        oldValue: toJsonValue(input.oldValue),
        newValue: toJsonValue(input.newValue),
        actorId,
      },
      select: { id: true, tenantId: true, category: true, key: true, oldValue: true, newValue: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        action: "SETTINGS_CHANGED",
        actorId,
        metadata: { category: input.category, key: input.key },
      },
    });

    return change;
  });
}

export async function listSettingsChanges(tenantId: string, category?: string) {
  return prisma.settingsChange.findMany({
    where: { tenantId, ...(category ? { category } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, category: true, key: true, oldValue: true, newValue: true, actorId: true, createdAt: true },
  });
}
