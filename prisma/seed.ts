import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TENANT_ID = "demo-lending";
const USERS = [
  { id: "user_admin_demo", email: "admin@shadowspark.tech", name: "Demo Admin", role: "ADMIN" },
  { id: "user_manager_demo", email: "manager@shadowspark.tech", name: "Demo Manager", role: "MANAGER" },
  { id: "user_agent_demo", email: "agent@shadowspark.tech", name: "Demo Agent", role: "AGENT" },
];

const LOAN_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "KYC_PENDING",
  "KYC_VERIFIED",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "CLOSED",
  "DEFAULTED",
  "RESTRUCTURED",
] as const;

const APPLICANTS = [
  "Adaeze Okonkwo",
  "Emeka Nwosu",
  "Fatima Bello",
  "Chukwudi Eze",
  "Ngozi Adeyemi",
  "Babajide Alabi",
  "Chioma Obiora",
  "Tunde Fashola",
  "Amaka Osei",
  "Kelechi Ibe",
  "Yewande Adeleke",
  "Olumide Ogunleye",
  "Zainab Usman",
  "Ifeanyi Nnamdi",
  "Amina Ibrahim",
];

const PIDGIN_MESSAGES = [
  "Oga, how far my loan?",
  "Abeg, when dem go approve am?",
  "I don send my documents o",
  "Wetin remain wey I go do?",
  "My people need the money sharp sharp",
];

async function clearDemoTenant() {
  // Delete child rows for the demo tenant in dependency order.
  await prisma.message.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.kycDocument.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.kycOcrJob.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.kycVerificationHistory.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditLog.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.workflowExecution.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.workflow.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.loanApplication.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.apiKey.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.invitation.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.settingsChange.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenantMembership.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "user_" } } });
  await prisma.tenant.deleteMany({ where: { id: TENANT_ID } });
}

async function main() {
  console.log("🌱 Seeding ShadowSpark demo data...");

  await clearDemoTenant();

  const tenant = await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Demo Lending Co", companyName: "ShadowSpark Demo Lending" },
  });
  console.log(`✅ Tenant: ${tenant.id}`);

  const passwordHash = await bcrypt.hash("Demo@1234", 12);
  const users = await Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          password: passwordHash,
          role: u.role,
        },
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          password: passwordHash,
          role: u.role,
        },
      })
    )
  );

  await prisma.tenantMembership.createMany({
    data: users.map((u) => ({ tenantId: tenant.id, userId: u.id, role: u.role ?? "USER" })),
    skipDuplicates: true,
  });
  console.log(`✅ Users: ${users.map((u) => u.email).join(", ")}`);

  const adminId = users.find((u) => u.role === "ADMIN")!.id;

  // 15 loans across 30 days covering every status.
  const loans: Awaited<ReturnType<typeof prisma.loanApplication.create>>[] = [];
  for (let i = 0; i < 15; i++) {
    const status = LOAN_STATUSES[i % LOAN_STATUSES.length];
    const createdAt = new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000);
    const loan = await prisma.loanApplication.create({
      data: {
        tenantId: tenant.id,
        applicantName: APPLICANTS[i],
        applicantPhone: `+23480${1000000 + i * 11111}`,
        loanAmount: new Prisma.Decimal(100000 + i * 50000),
        loanPurpose: "Working capital",
        status,
        createdAt,
        updatedAt: createdAt,
      },
    });
    loans.push(loan);

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        loanApplicationId: loan.id,
        action: "LOAN_CREATED",
        actorId: adminId,
        metadata: { amount: Number(loan.loanAmount), status },
      },
    });

    console.log(`  ✅ Loan ${i + 1}: ${loan.applicantName} — ₦${Number(loan.loanAmount).toLocaleString()} (${status})`);
  }

  // 20 KYC documents (multiple per loan).
  for (let i = 0; i < 20; i++) {
    const loan = loans[i % loans.length];
    const status = i % 5 === 0 ? "REJECTED" : i % 3 === 0 ? "VERIFIED" : "PENDING";
    await prisma.kycDocument.create({
      data: {
        tenantId: tenant.id,
        loanApplicationId: loan.id,
        type: i % 2 === 0 ? "ID_DOCUMENT" : "PROOF_OF_ADDRESS",
        status,
        fileUrl: `https://placehold.co/600x400/1e293b/94a3b8?text=${encodeURIComponent(loan.applicantName)}+KYC+${i}`,
      },
    });
  }
  console.log("✅ 20 KYC documents");

  // 20 messages, some in Pidgin.
  for (let i = 0; i < 20; i++) {
    const loan = loans[i % loans.length];
    const isPidgin = i % 3 === 0;
    const content = isPidgin
      ? PIDGIN_MESSAGES[i % PIDGIN_MESSAGES.length]
      : `Hi, this is ${loan.applicantName}. I would like an update on my loan application.`;
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        loanApplicationId: loan.id,
        channel: i % 2 === 0 ? "WHATSAPP" : "SMS",
        direction: i % 4 === 0 ? "INBOUND" : "OUTBOUND",
        status: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"][i % 5],
        content,
        senderId: adminId,
      },
    });
  }
  console.log("✅ 20 messages");

  // 5 workflows.
  for (let i = 0; i < 5; i++) {
    await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: ["KYC Review", "Approve & Disburse", "Default Follow-up", "Repayment Reminder", "Risk Escalation"][i],
        description: `Workflow ${i + 1} for demo tenant`,
        nodes: [{ id: "start", type: "start" }, { id: "action", type: "action" }],
        edges: [{ source: "start", target: "action" }],
        isActive: true,
        createdById: adminId,
      },
    });
  }
  console.log("✅ 5 workflows");

  // 20 audit logs.
  const auditActions = [
    "LOAN_CREATED",
    "LOAN_UPDATED",
    "KYC_VERIFIED",
    "KYC_REJECTED",
    "MESSAGE_SENT",
    "WORKFLOW_EXECUTED",
    "USER_INVITED",
    "API_KEY_CREATED",
    "SETTINGS_CHANGED",
  ];
  for (let i = 0; i < 20; i++) {
    const loan = loans[i % loans.length];
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        loanApplicationId: loan.id,
        action: auditActions[i % auditActions.length],
        actorId: adminId,
        metadata: { demo: true, index: i },
      },
    });
  }
  console.log("✅ 20 audit logs");

  // 10 repayments via Payment table (no dedicated Repayment model).
  // Create a single demo lead to satisfy the Payment relation.
  const lead = await prisma.lead.upsert({
    where: { email: "repayments@shadowspark.demo" },
    update: {
      phoneNumber: "+2348000000000",
      status: "converted",
    },
    create: {
      email: "repayments@shadowspark.demo",
      phoneNumber: "+2348000000000",
      status: "converted",
    },
  });
  await prisma.payment.deleteMany({ where: { leadId: lead.id } });
  for (let i = 0; i < 10; i++) {
    await prisma.payment.create({
      data: {
        amount: 10000 + i * 5000,
        status: i % 4 === 0 ? "failed" : "successful",
        reference: `SEED-REPAY-${Date.now()}-${i}`,
        leadId: lead.id,
      },
    });
  }
  console.log("✅ 10 repayments");

  console.log("\n🎉 Demo seed complete!");
  console.log("   Logins (all users): Demo@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
