/**
 * ──────────────────────────────────────────────────
 * Backward-compatible re-export shim.
 *
 * New code should import directly from `@/lib/ledger/index`.
 * This file re-exports the LedgerService + helpers so
 * existing imports continue to work.
 * ──────────────────────────────────────────────────
 */

export { LedgerService, signedToDual, dualToSigned } from "@/lib/ledger/index";
export type { LedgerEntryInput, TransactionState, PrismaTransaction } from "@/lib/ledger/index";
