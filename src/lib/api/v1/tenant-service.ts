import { prisma } from "@/lib/prisma";

export async function getTenantProfile(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          loanApplications: true,
          kycDocuments: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return tenant;
}

