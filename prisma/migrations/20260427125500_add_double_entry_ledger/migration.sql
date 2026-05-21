-- AlterTable: replace Entry.amount with debit/credit columns
ALTER TABLE "Entry" DROP COLUMN "amount",
ADD COLUMN     "credit" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "debit" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT;

-- AlterTable: rename LedgerTransaction.status -> state, add description + updatedAt
ALTER TABLE "LedgerTransaction" DROP COLUMN "status",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: dedicated idempotency index for fast retry checks
CREATE TABLE "LedgerIdempotency" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerIdempotency_idempotencyKey_key" ON "LedgerIdempotency"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerIdempotency_transactionId_key" ON "LedgerIdempotency"("transactionId");

-- AddForeignKey
ALTER TABLE "LedgerIdempotency" ADD CONSTRAINT "LedgerIdempotency_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
