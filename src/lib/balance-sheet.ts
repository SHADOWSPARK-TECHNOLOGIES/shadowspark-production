import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export type BalanceSheetAccount = {
  id: string;
  type: string;
  currency: string;
  /** Raw signed balance in Kobo (positive=credit, negative=debit) */
  rawBalance: bigint;
  /** Display value — always positive with direction context */
  displayBalance: number;
  /** Human-readable direction */
  nature: "debit" | "credit";
};

export type BalanceSheetCategory = {
  label: string;
  total: number;
  accounts: BalanceSheetAccount[];
};

export type SovereignBalanceSheet = {
  assets: BalanceSheetCategory;
  liabilities: BalanceSheetCategory;
  equity: BalanceSheetCategory;
  /** Total Assets should equal Total Liabilities + Total Equity */
  isBalanced: boolean;
  /** Total Assets in Naira */
  totalAssets: number;
  /** Total Liabilities + Equity in Naira */
  totalLiabilitiesPlusEquity: number;
  /** When the report was generated */
  timestamp: Date;
};

// ──────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────

/**
 * Aggregates all ledger accounts into a real-time
 * Assets / Liabilities / Equity balance sheet report.
 *
 * Accounting convention (using new debit/credit schema):
 *   Assets (WALLET)        → Debit-natural  → display as positive
 *   Expenses (EXPENSE)     → Debit-natural  → subtracted from Equity
 *   Revenue (INCOME)       → Credit-natural → added to Equity
 *   Liabilities (CLEARING) → Credit-natural → displayed as positive
 *
 * The Entry model uses: debit (positive) = debit entry,
 * credit (positive) = credit entry.
 * Net balance per account = sum(debit) - sum(credit).
 *   Positive net = debit balance (normal for assets/expenses)
 *   Negative net = credit balance (normal for liabilities/revenue/equity)
 *
 * Formula:  Assets = Liabilities + Equity
 */
export async function getSovereignBalanceSheet(): Promise<SovereignBalanceSheet> {
  // Fetch all accounts with their posted-entry balances
  const accounts = await prisma.account.findMany({
    include: {
      entries: {
        where: {
          transaction: {
            state: "POSTED",
          },
        },
        select: { debit: true, credit: true },
      },
    },
  });

  const now = new Date();

  // Compute raw balances per account
  const accountBalances: BalanceSheetAccount[] = accounts.map((acct) => {
    const totalDebit = acct.entries.reduce(
      (sum, e) => sum + e.debit,
      BigInt(0)
    );
    const totalCredit = acct.entries.reduce(
      (sum, e) => sum + e.credit,
      BigInt(0)
    );
    // Signed balance: positive = net credit, negative = net debit
    const rawBalance = totalCredit - totalDebit;

    // Display logic per account type
    let displayBalance: number;
    let nature: "debit" | "credit";

    switch (acct.type) {
      // ── ASSETS (WALLET) ──
      // Natural balance is DEBIT (net debit > net credit → rawBalance negative).
      // Display as positive when in a debit position.
      case "WALLET": {
        if (rawBalance < BigInt(0)) {
          // More debits than credits → healthy asset position
          displayBalance = Number(-rawBalance) / 100;
          nature = "debit";
        } else {
          // Overdrawn / negative asset position
          displayBalance = Number(rawBalance) / 100;
          nature = "credit";
        }
        break;
      }

      // ── LIABILITIES (CLEARING) ──
      // Natural balance is CREDIT (net credit > net debit → rawBalance positive).
      case "CLEARING": {
        if (rawBalance > BigInt(0)) {
          displayBalance = Number(rawBalance) / 100;
          nature = "credit";
        } else {
          displayBalance = Number(-rawBalance) / 100;
          nature = "debit";
        }
        break;
      }

      // ── REVENUE (INCOME) ──
      // Natural balance is CREDIT (positive).
      case "INCOME": {
        if (rawBalance > BigInt(0)) {
          displayBalance = Number(rawBalance) / 100;
          nature = "credit";
        } else {
          displayBalance = Number(-rawBalance) / 100;
          nature = "debit";
        }
        break;
      }

      // ── EXPENSES ──
      // Natural balance is DEBIT (net debit > net credit → rawBalance negative).
      case "EXPENSE": {
        if (rawBalance < BigInt(0)) {
          displayBalance = Number(-rawBalance) / 100;
          nature = "debit";
        } else {
          displayBalance = Number(rawBalance) / 100;
          nature = "credit";
        }
        break;
      }

      default: {
        displayBalance = Number(rawBalance) / 100;
        nature = rawBalance >= BigInt(0) ? "credit" : "debit";
        break;
      }
    }

    return {
      id: acct.id,
      type: acct.type,
      currency: acct.currency,
      rawBalance,
      displayBalance,
      nature,
    };
  });

  // ── Categorise into Assets / Liabilities / Equity ──

  const assets: BalanceSheetAccount[] = [];
  const liabilities: BalanceSheetAccount[] = [];
  const equity: BalanceSheetAccount[] = [];

  for (const acct of accountBalances) {
    switch (acct.type) {
      case "WALLET":
        assets.push(acct);
        break;
      case "CLEARING":
        // Clearing accounts used for settlement timing → Liability
        liabilities.push(acct);
        break;
      case "INCOME":
        // Revenue → increases Equity
        equity.push(acct);
        break;
      case "EXPENSE":
        // Expenses → decrease Equity
        equity.push(acct);
        break;
      default:
        // Unknown types treated as equity
        equity.push(acct);
        break;
    }
  }

  // Totals (in Naira)
  // For assets (WALLET): debit-natural, so rawBalance is negative. -rawBalance = positive.
  const totalAssets = assets.reduce(
    (sum, a) => sum + (a.type === "WALLET" ? Number(-a.rawBalance) / 100 : 0),
    0
  );

  // Liabilities total: positive credit balances
  const totalLiabilities = liabilities.reduce(
    (sum, a) => sum + (a.rawBalance > BigInt(0) ? Number(a.rawBalance) / 100 : 0),
    0
  );

  // Equity total: sum of INCOME (credit positive) + EXPENSE (debit negative)
  const totalEquity = equity.reduce((sum, a) => sum + Number(a.rawBalance) / 100, 0);

  const totalLiabilitiesPlusEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesPlusEquity) < 0.01; // within 1 kobo

  return {
    assets: {
      label: "Assets",
      total: totalAssets,
      accounts: assets,
    },
    liabilities: {
      label: "Liabilities",
      total: totalLiabilities,
      accounts: liabilities,
    },
    equity: {
      label: "Equity",
      total: totalEquity,
      accounts: equity,
    },
    isBalanced,
    totalAssets,
    totalLiabilitiesPlusEquity,
    timestamp: now,
  };
}

/**
 * Quick-print the balance sheet to the console (for debugging / CLI).
 */
export function printBalanceSheet(sheet: SovereignBalanceSheet): void {
  const fmt = (n: number) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  console.log("\n═══════════════════════════════════════════");
  console.log("  SOVEREIGN BALANCE SHEET");
  console.log(`  ${sheet.timestamp.toISOString()}`);
  console.log("═══════════════════════════════════════════\n");

  for (const category of [sheet.assets, sheet.liabilities, sheet.equity]) {
    console.log(`  ${category.label}`);
    console.log("  " + "-".repeat(40));
    for (const acct of category.accounts) {
      const dir = acct.nature === "debit" ? "Dr" : "Cr";
      console.log(`    ${acct.id.padEnd(40)} ${fmt(acct.displayBalance)} ${dir}`);
    }
    console.log(`  ${" ".repeat(32)} ──────────`);
    console.log(`  ${" ".repeat(32)} ${fmt(category.total)}`);
    console.log();
  }

  console.log("  ───────────────────────────────────────");
  console.log(`  Total Assets:               ${fmt(sheet.totalAssets)}`);
  console.log(`  Total Liabilities + Equity:  ${fmt(sheet.totalLiabilitiesPlusEquity)}`);
  console.log(`  Balanced:                   ${sheet.isBalanced ? "✅ YES" : "❌ NO"}`);
  console.log("──────────────────────────────────────────\n");
}
