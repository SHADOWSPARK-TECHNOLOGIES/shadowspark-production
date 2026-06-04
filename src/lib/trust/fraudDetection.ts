import { prisma } from "@/lib/prisma";

const SEVERITY_WEIGHTS: Record<string, number> = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 7,
  CRITICAL: 15,
};

export async function evaluateFlags(targetType: "LISTING" | "USER", targetId: string) {
  const openFlags = await prisma.fraudFlag.findMany({
    where: { targetType, targetId, status: { in: ["OPEN", "INVESTIGATING"] } },
  });

  const severityScore = openFlags.reduce((sum, flag) => sum + (SEVERITY_WEIGHTS[flag.severity] ?? 0), 0);
  const hasCritical = openFlags.some((f) => f.severity === "CRITICAL");

  if (severityScore >= 15 || hasCritical) {
    if (targetType === "LISTING") {
      await prisma.listing.update({
        where: { id: targetId },
        data: {
          active: false,
          suspendedAt: new Date(),
          suspendReason: "Auto-suspended: fraud risk score exceeded threshold",
        },
      });
    } else if (targetType === "USER") {
      await prisma.user.update({
        where: { id: targetId },
        data: { suspended: true, suspendedAt: new Date() },
      });
    }
    return { suspended: true, score: severityScore };
  }

  return { suspended: false, score: severityScore };
}
