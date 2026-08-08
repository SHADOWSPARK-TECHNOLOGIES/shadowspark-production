import { prisma } from "@/lib/prisma";

export async function getTenantProfile(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true, name: true, companyName: true, createdAt: true, updatedAt: true,
      _count: { select: { loanApplications: true, kycDocuments: true, users: true } },
    },
  });

  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  return {
    id: tenant.id,
    name: tenant.name,
    companyName: tenant.companyName,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
    stats: {
      users: tenant._count.users,
      loans: tenant._count.loanApplications,
      kycDocuments: tenant._count.kycDocuments,
    },
  };
}

export async function getOrCreateTenant(name: string): Promise<string> {
  const tenant = await prisma.tenant.create({
    data: { name, companyName: name },
    select: { id: true },
  });
  return tenant.id;
}
