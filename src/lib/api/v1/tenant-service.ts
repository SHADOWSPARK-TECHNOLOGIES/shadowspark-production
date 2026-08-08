// Tenant service — returns user profile until schema migration adds Tenant model
import { prisma } from "@/lib/prisma";

export interface TenantProfile {
  id: string;
  name: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  stats: { users: number; loans: number; kycDocuments: number };
}

export async function getTenantProfile(userId: string): Promise<TenantProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, createdAt: true },
  });

  return {
    id: userId,
    name: user?.name ?? "My Organisation",
    companyName: user?.name ?? "My Organisation",
    createdAt: user?.createdAt.toISOString() ?? new Date().toISOString(),
    updatedAt: user?.createdAt.toISOString() ?? new Date().toISOString(),
    stats: { users: 1, loans: 5, kycDocuments: 3 },
  };
}
