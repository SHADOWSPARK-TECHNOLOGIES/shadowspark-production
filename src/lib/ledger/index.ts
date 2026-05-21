import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

// ══════════════════════════════════════════════════════════════════════════
// LEDGER INVARIANTS (DO NOT VIOLATE)
// ══════════════════════════════════════════════════════════════════════════
//
// 1. DOUBLE-ENTRY BALANCE
//    Every POSTED transaction MUST have total debits = total credits.
//    Violation causes ledger drift — irreversible without manual audit.
//    Enforced by validateBalanced() before any write.
//
// 2. ALL MONEY VALUES ARE BigInt KOBO (subunits of Naira)
//    - 1 Naira = 100 kobo
//    - Never store float or Number monetary values in the ledger.
//    - Conversion: nairaToKobo(amount) / koboToNaira(amount) helpers.
//    - Formatting only occurs at the UI/API serialization boundary.
//
// 3. ATOMICITY — NO MULTI-STEP LEDGER MUTATION OUTSIDE A TRANSACTION
//    Every sequence of writes involving Account, LedgerTransaction, Entry,
//    or LedgerIdempotency must be wrapped in prisma.$transaction() or
//    use a shared interactive transaction client passed from a parent.
//    Never call prisma.entry.create(), prisma.ledgerTransaction.create(),
//    prisma.ledgerIdempotency.create(), or prisma.account.upsert() on
//    the top-level prisma instance for multi-step money flows.
//
// 4. APPEND-ONLY — NO DELETE OR UPDATE ON entries
//    The Entry table is append-only. Corrections are made via reversal
//    transactions (POSTED → REVERSED), never by mutating existing rows.
//
// 5. IDEMPOTENCY
//    Every transaction MUST carry a unique idempotencyKey. The
//    LedgerIdempotency table prevents duplicate processing.
//
// ══════════════════════════════════════════════════════════════════════════

/** 1 Naira = 100 kobo. All ledger values are in kobo (BigInt). */
const KOBO_PER_NAIRA = BigInt(100);

/**
 * Convert a Naira amount (as BigInt) to kobo subunits.
 * Example: nairaToKobo(1_000_000_000n) => 100_000_000_000n
 */
function nairaToKobo(amount: bigint): bigint {
  return amount * KOBO_PER_NAIRA;
}

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export type LedgerEntryInput = {
  accountId: string;
  /** Amount in kobo/subunits. Must be ≥0. One of debit or credit must be 0. */
  debit?: bigint;
  /** Amount in kobo/subunits. Must be ≥0. One of debit or credit must be 0. */
  credit?: bigint;
  currency?: string;
  description?: string;
};

export type TransactionState = "PENDING" | "POSTED" | "REVERSED";

// ──────────────────────────────────────────────────
// Transaction client type
// ──────────────────────────────────────────────────

/**
 * The Prisma interactive transaction client type, inferred from the
 * extended `prisma` instance.  Used to pass a transaction context
 * into `LedgerService` methods from a caller's `$transaction` block.
 */
export type PrismaTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

// ──────────────────────────────────────────────────
// VASP Capital Threshold Helpers
// ──────────────────────────────────────────────────

/**
 * SEC VASP Capital Thresholds (in Naira, converted to kobo via nairaToKobo).
 *
 * ISA 2025 / SEC Circular 26-1 mandates:
 *   - DAOP / RATOP:   ₦1,000,000,000 minimum capital
 *   - DAX / Custodians: ₦2,000,000,000 minimum capital
 *
 * NOTE: This logic uses wallet balance as a proxy for capital thresholds.
 * It is NOT a full legal/regulatory capital-base engine. Per SEC Nigeria's
 * capital-base framework (sec.gov.ng), the following items are EXCLUDED
 * from qualifying regulatory capital and are NOT reflected in this proxy:
 *   - Borrowed funds / loans
 *   - Client monies held in trust or segregation
 *   - Unrealised gains on revaluation of assets
 *   - Deferred tax assets
 *   - Encumbered capital (pledged as collateral)
 *   - Intangible assets (goodwill, intellectual property)
 * True regulatory capital adequacy requires a full SEC capital-base
 * calculation that deducts these items from raw wallet balance.
 */
export const VASP_CAPITAL_FLOOR_DAOP_NAIRA = BigInt(1_000_000_000); // ₦1B
export const VASP_CAPITAL_FLOOR_DAX_NAIRA  = BigInt(2_000_000_000); // ₦2B
const VASP_CAPITAL_FLOOR_DAOP = nairaToKobo(VASP_CAPITAL_FLOOR_DAOP_NAIRA);
const VASP_CAPITAL_FLOOR_DAX  = nairaToKobo(VASP_CAPITAL_FLOOR_DAX_NAIRA);

export type VaspTier = "NONE" | "DAOP_RATOP" | "DAX_CUSTODIAN";

/**
 * Pure function: determine VASP tier from a wallet balance (in kobo).
 *
 * This is the SINGLE source of truth for tier classification. All callers
 * (including checkAndProvisionCapitalReserve and the compliance API) must
 * use this function rather than duplicating comparison logic.
 *
 * @param walletBalance  Aggregated wallet balance in kobo (BigInt)
 * @returns              The applicable SEC VASP tier
 */
export function getVaspTier(walletBalance: bigint): VaspTier {
  if (walletBalance >= VASP_CAPITAL_FLOOR_DAX) return "DAX_CUSTODIAN";
  if (walletBalance >= VASP_CAPITAL_FLOOR_DAOP) return "DAOP_RATOP";
  return "NONE";
}

// ──────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────

function normalizeEntries(entries: LedgerEntryInput[]) {
  return entries.map((e) => ({
    accountId: e.accountId,
    debit: e.debit ?? BigInt(0),
    credit: e.credit ?? BigInt(0),
    currency: e.currency ?? "NGN",
    description: e.description ?? null,
  }));
}

function validateEntry(entry: {
  debit: bigint;
  credit: bigint;
}): void {
  if (entry.debit < BigInt(0) || entry.credit < BigInt(0)) {
    throw new Error("debit and credit must be non-negative");
  }
  if (entry.debit > BigInt(0) && entry.credit > BigInt(0)) {
    throw new Error("entry cannot have both debit and credit > 0");
  }
  if (entry.debit === BigInt(0) && entry.credit === BigInt(0)) {
    throw new Error("entry must have either debit or credit > 0");
  }
}

function validateBalanced(entries: { debit: bigint; credit: bigint }[]): void {
  const totalDebit = entries.reduce((s, e) => s + e.debit, BigInt(0));
  const totalCredit = entries.reduce((s, e) => s + e.credit, BigInt(0));
  if (totalDebit !== totalCredit) {
    throw new Error(
      `Transaction not balanced: total debit ${totalDebit} ≠ total credit ${totalCredit}`
    );
  }
}

// ──────────────────────────────────────────────────
// LedgerService — Public API
// ──────────────────────────────────────────────────

export class LedgerService {
  /**
   * Post a double-entry transaction atomically.
   *
   * 1. Validates each entry (non-negative, exclusive debit/credit).
   * 2. Validates that total debits = total credits.
   * 3. Creates the LedgerTransaction (PENDING) + Entries.
   * 4. Posts it (POSTED).
   *
   * If `tx` is provided the entire operation runs inside that
   * parent transaction (for composition with other writes).
   */
  static async postTransaction(
    params: {
      userId: string;
      reference: string;
      idempotencyKey: string;
      description?: string;
      entries: LedgerEntryInput[];
    },
    tx?: PrismaTransaction
  ): Promise<{
    transactionId: string;
    state: TransactionState;
  }> {
    const client = tx ?? prisma;
    const normalized = normalizeEntries(params.entries);

    // Validate entry-level rules
    normalized.forEach(validateEntry);
    // Validate double-entry balance
    validateBalanced(normalized);

    const run = async (c: typeof client) => {
      // Create the transaction directly in POSTED state (single write).
      // The PENDING → POSTED two-step is unnecessary because the entire
      // operation runs inside a single Prisma transaction — no other
      // process can observe the intermediate PENDING state.
      // This eliminates one write + one update per transaction.
      const transaction = await c.ledgerTransaction.create({
        data: {
          userId: params.userId,
          reference: params.reference,
          description: params.description ?? null,
          idempotencyKey: params.idempotencyKey,
          state: "POSTED",
          postedAt: new Date(),
          entries: {
            create: normalized.map((e) => ({
              accountId: e.accountId,
              debit: e.debit,
              credit: e.credit,
              currency: e.currency,
              description: e.description,
            })),
          },
        },
        select: { id: true },
      });

      // Record idempotency key in the dedicated table
      await c.ledgerIdempotency.create({
        data: {
          idempotencyKey: params.idempotencyKey,
          transactionId: transaction.id,
        },
      });

      return { transactionId: transaction.id, state: "POSTED" as TransactionState };
    };

    if (tx) return run(tx);
    return prisma.$transaction((c) => run(c));
  }

  /**
   * Reverse a transaction.
   *
   * State machine:
   *   PENDING → REVERSED (never posted, just discard)
   *   POSTED  → REVERSED (create mirror entries to unwind)
   *
   * Returns the reversal transaction ID (new if POSTED → REVERSED).
   */
  static async reverseTransaction(
    transactionId: string,
    reason?: string,
    tx?: PrismaTransaction
  ): Promise<{
    reversalId: string;
    originalState: TransactionState;
  }> {
    const client = tx ?? prisma;

    const run = async (c: typeof client) => {
      // Fetch the current transaction with entries
      const original = await c.ledgerTransaction.findUnique({
        where: { id: transactionId },
        include: { entries: true },
      });

      if (!original) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }
      if (original.state === "REVERSED") {
        throw new Error(`Transaction ${transactionId} is already reversed`);
      }

      const prevState = original.state as TransactionState;

      if (original.state === "PENDING") {
        // Simply mark as reversed — no entries were ever posted
        await c.ledgerTransaction.update({
          where: { id: transactionId },
          data: {
            state: "REVERSED",
            postedAt: null,
          },
        });
        return { reversalId: transactionId, originalState: "PENDING" as TransactionState };
      }

      // POSTED → REVERSED: create mirror reversal entries
      // Mirror = swap debit ↔ credit for each original entry
      const reversalEntries = original.entries.map((e) => ({
        accountId: e.accountId,
        debit: e.credit, // original credit becomes reversal debit
        credit: e.debit, // original debit becomes reversal credit
        currency: e.currency,
        description: `[REVERSAL] ${reason ?? "No reason provided"}`,
      }));

      const reversalRef = `REV-${original.reference}`;
      const reversalKey = `rev-${original.idempotencyKey}`;

      const reversal = await c.ledgerTransaction.create({
        data: {
          userId: original.userId,
          reference: reversalRef,
          description: `Reversal of ${original.reference}: ${reason ?? "No reason"}`,
          idempotencyKey: reversalKey,
          state: "POSTED",
          postedAt: new Date(),
          entries: {
            create: reversalEntries,
          },
        },
        select: { id: true },
      });

      // Mark original as reversed
      await c.ledgerTransaction.update({
        where: { id: transactionId },
        data: { state: "REVERSED" },
      });

      return { reversalId: reversal.id, originalState: "POSTED" as TransactionState };
    };

    if (tx) return run(tx);
    return prisma.$transaction((c) => run(c));
  }

  /**
   * Get the current (or as-of) balance of an account.
   *
   * Balance = sum(debits) - sum(credits) for POSTED entries.
   *
   * A positive result means the account has a net debit balance
   * (normal for asset/expense accounts).
   * A negative result means net credit balance
   * (normal for liability/revenue/equity accounts).
   */
  static async getAccountBalance(
    accountId: string,
    asOfDate?: Date,
    tx?: PrismaTransaction
  ): Promise<{
    accountId: string;
    netDebit: bigint;
    netCredit: bigint;
    /** netDebit - netCredit */
    balance: bigint;
    asOf: Date | null;
  }> {
    const client = tx ?? prisma;

    const whereBase: Prisma.EntryWhereInput = {
      accountId,
      transaction: {
        state: "POSTED",
      },
    };

    if (asOfDate) {
      whereBase.createdAt = { lte: asOfDate };
    }

    const result = await client.entry.aggregate({
      where: whereBase,
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const netDebit = result._sum.debit ?? BigInt(0);
    const netCredit = result._sum.credit ?? BigInt(0);
    const balance = netDebit - netCredit;

    return {
      accountId,
      netDebit,
      netCredit,
      balance,
      asOf: asOfDate ?? null,
    };
  }

  /**
   * Ensure an account exists, creating it if necessary.
   *
   * The `code` is used as the account `id` (UUID format expected for
   * consistency with existing seed accounts like 1111...).
   * If an account with this ID already exists, it is returned as-is.
   */
  static async ensureAccount(
    params: {
      id: string;
      userId: string;
      type: string;
      currency?: string;
    },
    tx?: PrismaTransaction
  ) {
    const client = tx ?? prisma;
    return client.account.upsert({
      where: { id: params.id },
      update: {},
      create: {
        id: params.id,
        userId: params.userId,
        type: params.type,
        currency: params.currency ?? "NGN",
      },
    });
  }

  /**
   * Auto-provision an Escrow: Capital Reserve LIABILITY account for a VASP
   * institutional lead. The account is created/retrieved via ensureAccount()
   * and stored under the code `ESCROW-<first 8 chars of leadId>`.
   *
   * Accepts an optional PrismaTransaction for composition with the caller's
   * transactional context.
   *
   * @param leadId              The lead's UUID
   * @param leadName            Human-readable name for the escrow account
   * @param estimatedLiquidity  Self-reported liquidity in kobo (₦0.01 units)
   * @param tx                  Optional PrismaTransaction for composition
   * @returns                   The created or existing Account record
   */
  static async provisionVaspEscrowAccount(
    leadId: string,
    leadName: string,
    estimatedLiquidity: bigint,
    tx?: PrismaTransaction
  ) {
    const escrowCode = `ESCROW-${leadId.slice(0, 8)}`;

    return LedgerService.ensureAccount(
      {
        id: escrowCode,
        userId: leadId,
        type: 'liability',
        currency: 'NGN',
      },
      tx
    );
  }

  /**
   * Check a lead's aggregated wallet balance against the SEC VASP capital
   * thresholds and, if the ₦2B DAX/Custodian floor is met, auto-provision
   * and SEED a Capital Reserve Escrow with a double-entry transfer.
   *
   * SEC Circular 26-1 mandates:
   *   - DAOP / RATOP:  ₦1B minimum capital (Tier 1 — tracked, no escrow)
   *   - DAX / Custodians: ₦2B minimum capital (Tier 2 — auto-escrow provisioned)
   *
   * The escrow is ONLY provisioned at the ₦2B DAX threshold. The DAOP/RATOP
   * tier is informational only; escrow provisioning starts at institutional
   * custody scale.
   *
   * VASP tier is determined by the pure helper getVaspTier() (single source
   * of truth for tier classification). Uses wallet balance as a proxy for
   * capital thresholds — NOT a full regulatory capital-base engine.
   *
   * All operations run inside a SINGLE SERIALIZABLE transaction to guarantee
   * ledger truth (∑Debits − ∑Credits = 0 invariant).
   *
   * @param leadId   The lead's UUID (used as userId on wallet accounts)
   * @param leadName Human-readable name for compliance reporting
   * @returns        Object with escrow account (if provisioned), balance info,
   *                 seed transaction reference, and the VASP tier classification.
   */
  static async checkAndProvisionCapitalReserve(
    leadId: string,
    leadName: string
  ): Promise<{
    escrowAccount?: { id: string; type: string };
    seedTransactionId?: string;
    seedAmount: bigint;
    walletBalance: bigint;
    vaspTier: VaspTier;
    thresholdMet: boolean;
  }> {
    return prisma.$transaction(async (tx) => {
      const client = tx as unknown as PrismaTransaction;

      // 1. Aggregate wallet balance inside the transaction for consistency
      const aggregation = await client.entry.aggregate({
        where: {
          account: {
            userId: leadId,
            type: "WALLET",
          },
          transaction: {
            state: "POSTED",
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      });

      const totalDebit  = aggregation._sum.debit  ?? BigInt(0);
      const totalCredit = aggregation._sum.credit ?? BigInt(0);
      const walletBalance = totalDebit - totalCredit;

      // 2. Determine VASP tier via pure helper (single source of truth)
      const vaspTier = getVaspTier(walletBalance);
      const thresholdMet = vaspTier !== "NONE";

      // 3. Auto-provision + seed escrow ONLY at ₦2B DAX threshold
      let escrowAccount: { id: string; type: string } | undefined;
      let seedTransactionId: string | undefined;

      if (vaspTier === "DAX_CUSTODIAN") {
        const escrowCode = `ESCROW-${leadId.slice(0, 8)}`;

        // Ensure the escrow liability account exists (idempotent)
        const account = await LedgerService.ensureAccount(
          {
            id: escrowCode,
            userId: leadId,
            type: 'liability',
            currency: 'NGN',
          },
          client
        );
        escrowAccount = { id: account.id, type: account.type };

        // Find a wallet account to debit (first WALLET account for this user)
        const walletAccount = await client.account.findFirst({
          where: { userId: leadId, type: "WALLET" },
          orderBy: { createdAt: "asc" },
        });

        if (walletAccount) {
          // Seed the escrow via double-entry transfer:
          //   Debit  (reduce) lead's WALLET — asset decreases
          //   Credit (increase) ESCROW      — liability increases
          const seedReference = `ESCROW-SEED-${leadId.slice(0, 8)}-${Date.now()}`;
          const seedKey = `escrow-seed-${leadId.slice(0, 8)}`;

          const seedTx = await LedgerService.postTransaction(
            {
              userId: leadId,
              reference: seedReference,
              idempotencyKey: seedKey,
              description: `Capital Reserve Escrow seeding for ${leadName} (DAX Tier — ₦2B threshold met)`,
              entries: [
                {
                  accountId: walletAccount.id,
                  debit: VASP_CAPITAL_FLOOR_DAX,
                  credit: BigInt(0),
                  currency: "NGN",
                  description: `Escrow transfer to ${escrowCode}`,
                },
                {
                  accountId: escrowCode,
                  debit: BigInt(0),
                  credit: VASP_CAPITAL_FLOOR_DAX,
                  currency: "NGN",
                  description: `Capital Reserve escrow receipt from ${walletAccount.id}`,
                },
              ],
            },
            client
          );
          seedTransactionId = seedTx.transactionId;
        }
      }

      return {
        escrowAccount,
        seedTransactionId,
        seedAmount: vaspTier === "DAX_CUSTODIAN" ? VASP_CAPITAL_FLOOR_DAX : BigInt(0),
        walletBalance,
        vaspTier,
        thresholdMet,
      };
    }, { isolationLevel: "Serializable" });
  }
}

// ──────────────────────────────────────────────────
// Backward-compatible alias
// ──────────────────────────────────────────────────

/**
 * Legacy functions that mirror the old `src/lib/ledger.ts` API
 * using the new debit/credit schema.
 */

/** Helper: convert a signed amount (positive=credit, negative=debit)
 *  to the new { debit, credit } format for a single entry. */
export function signedToDual(
  signed: bigint
): { debit: bigint; credit: bigint } {
  if (signed >= BigInt(0)) {
    return { debit: BigInt(0), credit: signed };
  }
  return { debit: -signed, credit: BigInt(0) };
}

/** Helper: convert { debit, credit } back to signed amount. */
export function dualToSigned(debit: bigint, credit: bigint): bigint {
  // net = credit - debit (positive = credit balance)
  return credit - debit;
}
