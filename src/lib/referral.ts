import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function assignReferralCode(userId: string): Promise<string> {
  let code: string;
  let attempts = 0;

  do {
    code = generateReferralCode();
    attempts++;
    if (attempts > 10) throw new Error("Failed to generate unique referral code after 10 attempts");
  } while (await prisma.user.findUnique({ where: { referralCode: code } }));

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

export async function applyReferralCode(newUserId: string, referralCode: string): Promise<boolean> {
  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer || referrer.id === newUserId) return false;

  await prisma.$transaction([
    prisma.user.update({ where: { id: newUserId }, data: { referredBy: referrer.id } }),
    prisma.referral.create({
      data: { referrerId: referrer.id, referredUserId: newUserId, status: "PENDING" },
    }),
  ]);

  return true;
}
