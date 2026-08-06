-- CreateEnum
-- No enums used — assetType and status are plain TEXT/String fields.

-- CreateTable: tokenized_assets
CREATE TABLE "tokenized_assets" (
    "id" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "totalShares" INTEGER NOT NULL,
    "availableShares" INTEGER NOT NULL,
    "pricePerShare" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tokenized_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: token_holders
CREATE TABLE "token_holders" (
    "id" TEXT NOT NULL,
    "tokenizedAssetId" TEXT NOT NULL,
    "leadId" TEXT,
    "shares" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(19,4) NOT NULL,
    "totalPaid" DECIMAL(19,4) NOT NULL,
    "transactionId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_holders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_holders_tokenizedAssetId_fkey" FOREIGN KEY ("tokenizedAssetId") REFERENCES "tokenized_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "token_holders_leadId_idx" ON "token_holders"("leadId");
CREATE INDEX "token_holders_tokenizedAssetId_idx" ON "token_holders"("tokenizedAssetId");
