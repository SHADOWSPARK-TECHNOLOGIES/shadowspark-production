import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🏦 INITIATING SOVEREIGN CHART OF ACCOUNTS...");

  // Seed admin user first (required for Account.userId relation)
  const email = "admin@shadowspark.com";
  const password = await bcrypt.hash("password", 10);
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      role: "admin",
    },
  });
  console.log(`✅ Seeded admin user: ${email} (${adminUser.id})`);

  // Accounts matching IDs used in application code:
  //   expenses.ts -> 1111... (Cash), 2222... (Operating Expense)
  //   webhooks/paystack -> 1111... (Cash), 3333... (Revenue)
  //   LedgerService -> referenced by accountId in entries
  const SYSTEM_ACCOUNTS = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      userId: adminUser.id,
      type: "WALLET",
      currency: "NGN",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      userId: adminUser.id,
      type: "EXPENSE",
      currency: "NGN",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      userId: adminUser.id,
      type: "INCOME",
      currency: "NGN",
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      userId: adminUser.id,
      type: "CLEARING",
      currency: "NGN",
    },
  ];

  for (const account of SYSTEM_ACCOUNTS) {
    await prisma.account.upsert({
      where: { id: account.id },
      update: {},
      create: account,
    });
    console.log(`✅ VERIFIED [${account.type}]: ${account.id}`);
  }

  console.log("\n🔒 CHART OF ACCOUNTS SECURED.");

  await prisma.$disconnect();
  await pool.end();
}

main()
  .catch((e) => {
    console.error("❌ SEED FAILURE:", e);
    process.exit(1);
  });
