import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_demo" },
    create: { id: "tenant_demo", name: "ShadowSpark Demo", companyName: "ShadowSpark Technologies" },
    update: {},
  });
  console.log(`✅ Tenant: ${tenant.id}`);

  // Create demo admin user
  const passwordHash = await bcrypt.hash("Demo@2026!", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@shadowspark.tech" },
    create: { email: "admin@shadowspark.tech", password: passwordHash, name: "ShadowSpark Admin", role: "ADMIN" },
    update: {},
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    create: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
    update: {},
  });
  console.log(`✅ Admin user: ${user.email}`);

  // Seed 10 loan applications
  const applicants = [
    { name: "Adaeze Okonkwo", phone: "+2348012345678", amount: 500000, status: "APPROVED" },
    { name: "Emeka Nwosu", phone: "+2348023456789", amount: 250000, status: "KYC_PENDING" },
    { name: "Fatima Bello", phone: "+2348034567890", amount: 750000, status: "DISBURSED" },
    { name: "Chukwudi Eze", phone: "+2348045678901", amount: 1000000, status: "SUBMITTED" },
    { name: "Ngozi Adeyemi", phone: "+2348056789012", amount: 300000, status: "KYC_VERIFIED" },
    { name: "Babajide Alabi", phone: "+2348067890123", amount: 450000, status: "SUBMITTED" },
    { name: "Chioma Obiora", phone: "+2348078901234", amount: 600000, status: "KYC_PENDING" },
    { name: "Tunde Fashola", phone: "+2348089012345", amount: 850000, status: "APPROVED" },
    { name: "Amaka Osei", phone: "+2348090123456", amount: 175000, status: "CLOSED" },
    { name: "Kelechi Ibe", phone: "+2348001234567", amount: 2000000, status: "SUBMITTED" },
  ];

  for (const a of applicants) {
    const loan = await prisma.loanApplication.create({
      data: {
        tenantId: tenant.id,
        applicantName: a.name,
        applicantPhone: a.phone,
        loanAmount: new Prisma.Decimal(a.amount),
        status: a.status,
        loanPurpose: "Business expansion",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: { tenantId: tenant.id, loanApplicationId: loan.id, action: "LOAN_CREATED", actorId: user.id, metadata: { amount: a.amount } },
    });

    // KYC doc for KYC_PENDING/KYC_VERIFIED
    if (["KYC_PENDING", "KYC_VERIFIED", "APPROVED", "DISBURSED"].includes(a.status)) {
      await prisma.kycDocument.create({
        data: {
          tenantId: tenant.id,
          loanApplicationId: loan.id,
          type: "ID_DOCUMENT",
          status: a.status === "KYC_PENDING" ? "PENDING" : "VERIFIED",
          fileUrl: `https://placehold.co/600x400/1e293b/94a3b8?text=${encodeURIComponent(a.name)}+ID`,
        },
      });
    }

    // Seed a message
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        loanApplicationId: loan.id,
        channel: "WHATSAPP",
        direction: "INBOUND",
        status: "DELIVERED",
        content: `Hi, I am ${a.name} and I want to apply for a loan of ₦${a.amount.toLocaleString()}`,
      },
    });

    console.log(`  ✅ Loan: ${a.name} — ₦${a.amount.toLocaleString()} (${a.status})`);
  }

  console.log("\n🎉 Seeding complete!");
  console.log("   Login: admin@shadowspark.tech / Demo@2026!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
