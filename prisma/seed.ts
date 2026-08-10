import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import "dotenv/config";

const DB_URL_FILE = "/tmp/dburl.txt";

function hostnameOf(url: string): string {
  return new URL(url).hostname;
}

function withRequiredNeonParams(input: string): string {
  const parsed = new URL(input);
  parsed.searchParams.set("pgbouncer", "true");
  parsed.searchParams.set("sslmode", "require");
  return parsed.toString();
}

async function resolveDatabaseUrl(): Promise<{ url: string; source: "env" | "file" }> {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    return { url: withRequiredNeonParams(fromEnv), source: "env" };
  }

  const rawFile = await readFile(DB_URL_FILE, "utf8");
  const fileLines = rawFile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const explicitEntry = fileLines.find((line) => line.startsWith("DATABASE_URL="));
  const fromFile = explicitEntry
    ? explicitEntry.slice("DATABASE_URL=".length).trim()
    : fileLines[0];

  if (!fromFile) {
    throw new Error(`DATABASE_URL is missing and ${DB_URL_FILE} is empty`);
  }

  return { url: withRequiredNeonParams(fromFile), source: "file" };
}

async function countModel(
  prisma: PrismaClient,
  modelKey: string,
  label: string,
): Promise<{ table: string; count: number | null }> {
  try {
    const delegate = (prisma as unknown as Record<string, { count: () => Promise<number> }>)[modelKey];
    if (!delegate || typeof delegate.count !== "function") {
      return { table: label, count: null };
    }

    const count = await delegate.count();
    return { table: label, count };
  } catch {
    return { table: label, count: null };
  }
}

async function main() {
  const envUrl = process.env.DATABASE_URL?.trim();
  const envHostname = envUrl ? hostnameOf(envUrl) : "<unset>";
  console.log(`[diagnose] process.env.DATABASE_URL hostname: ${envHostname}`);

  const { url, source } = await resolveDatabaseUrl();
  console.log(`[diagnose] runtime datasource source: ${source}`);
  console.log(`[diagnose] effective datasource hostname: ${hostnameOf(url)}`);

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  if (source === "file") {
    console.log(`[diagnose] loaded DATABASE_URL from ${DB_URL_FILE}`);
  }

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

  const modelsToCount = [
    { key: "tenant", label: "Tenant" },
    { key: "user", label: "User" },
    { key: "loanApplication", label: "LoanApplication" },
    { key: "kycDocument", label: "KycDocument" },
    { key: "message", label: "Message" },
    { key: "workflow", label: "Workflow" },
    { key: "auditLog", label: "AuditLog" },
  ] as const;

  console.log("\n📊 ROW COUNTS");
  for (const model of modelsToCount) {
    const result = await countModel(prisma, model.key, model.label);
    const renderedCount = result.count === null ? "MISSING" : String(result.count);
    console.log(`${result.table}\t${renderedCount}`);
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ SEED FAILURE:", e);
    process.exit(1);
  });
