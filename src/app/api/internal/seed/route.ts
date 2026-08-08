import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// One-time seed endpoint — DELETE this file after running once
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bcrypt = await import("bcryptjs");

    // Tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: "tenant_demo" },
      create: { id: "tenant_demo", name: "ShadowSpark Demo", companyName: "ShadowSpark Technologies" },
      update: {},
    });

    // Admin user
    const passwordHash = await bcrypt.hash("Demo@2026!", 12);
    const user = await prisma.user.upsert({
      where: { email: "admin@shadowspark.tech" },
      create: {
        email: "admin@shadowspark.tech",
        name: "Admin User",
        password: passwordHash,
        role: "ADMIN",
      },
      update: {},
    });

    // TenantMembership
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      create: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
      update: {},
    });

    // Seed 10 loans
    const statuses = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISBURSED"];
    const loans = [];
    for (let i = 1; i <= 10; i++) {
      const loan = await prisma.loanApplication.upsert({
        where: { id: `loan_seed_${i}` },
        create: {
          id: `loan_seed_${i}`,
          tenantId: tenant.id,
          applicantName: `Applicant ${i}`,
          applicantPhone: `+2348${String(i).padStart(9, "0")}`,
          loanAmount: new Prisma.Decimal(50000 * i),
          loanPurpose: "Business expansion",
          status: statuses[i % statuses.length],
        },
        update: {},
      });
      loans.push(loan);
    }

    // Audit log for first loan
    await prisma.auditLog.upsert({
      where: { id: "audit_seed_1" },
      create: {
        id: "audit_seed_1",
        tenantId: tenant.id,
        userId: user.id,
        action: "LOAN_CREATED",
        entityType: "LoanApplication",
        entityId: loans[0].id,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      seeded: { tenant: tenant.id, user: user.email, loans: loans.length },
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
