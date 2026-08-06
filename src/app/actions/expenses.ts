"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { LedgerService, type PrismaTransaction } from "@/lib/ledger";

export async function addExpense(userId: string, amountInNaira: number, description: string) {
  const amountInKobo = BigInt(amountInNaira * 100);
  
  // Start a transaction for Dual-Write Engine
  return await prisma.$transaction(async (tx) => {
    // 1. Create the legacy Expense record (using SystemEvent since Expense model doesn't exist)
    const legacyExpense = await tx.systemEvent.create({
      data: {
        type: "EXPENSE",
        message: description,
        metadata: {
          userId,
          amount: Number(amountInKobo),
          currency: "NGN",
        },
      },
    });

    const reference = `EXP-${legacyExpense.id}`;
    const idempotencyKey = crypto.randomUUID();

    // 2. Use LedgerService to post a balanced transaction
    // Debit Operating Expense (2222...) — a debit increases expense
    // Credit Cash (1111...) — a credit decreases cash (asset)
    await LedgerService.postTransaction(
      {
        userId,
        reference,
        idempotencyKey,
        description,
        entries: [
          {
            accountId: "22222222-2222-2222-2222-222222222222", // Operating Expense
            debit: amountInKobo,
            credit: BigInt(0),
          },
          {
            accountId: "11111111-1111-1111-1111-111111111111", // Cash
            debit: BigInt(0),
            credit: amountInKobo,
          },
        ],
      },
      tx as unknown as PrismaTransaction
    );

    return { success: true, reference };
  });
}
