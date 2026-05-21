import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@shadowspark.com";
  const password = await bcrypt.hash("password", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      role: "admin",
    },
  });

  console.log(`✅ Seeded admin user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
