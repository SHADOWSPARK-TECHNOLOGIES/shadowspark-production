import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database connectivity...");
  try {
    const userCount = await prisma.user.count();
    console.log(`Connection successful. Total users: ${userCount}`);

    const admin = await prisma.user.findUnique({
      where: { email: "admin@shadowspark.com" },
    });

    if (admin) {
      console.log("Admin user found:");
      console.log(JSON.stringify({ ...admin, password: "[REDACTED]" }, null, 2));
    } else {
      console.log("Admin user NOT found. Creating admin user...");
      const hashedPassword = await bcrypt.hash("shadowspark_admin_2026", 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: "admin@shadowspark.com",
          name: "ShadowSpark Admin",
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("Admin user created successfully.");
    }
  } catch (error) {
    console.error("Database check failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
