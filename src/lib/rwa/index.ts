import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/lib/ledger/index";

export interface PurchaseSharesResult {
  tokenizedAssetId: string;
  assetName: string;
  shares: number;
  totalPaid: string; // decimal string
  transactionId: string;
  remainingShares: number;
}

/**
 * Purchase shares in a tokenized asset.
 * Creates a ledger transaction:
 *   Debit: HNW Client Wallet (Asset)
 *   Credit: Real Estate Asset Pool (Asset Swap)
 */
export async function purchaseShares(
  leadId: string,
  tokenizedAssetId: string,
  shares: number
): Promise<PurchaseSharesResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock and validate the asset
    const asset = await tx.tokenizedAsset.findUnique({
      where: { id: tokenizedAssetId },
    });
    if (!asset) throw new Error(`TokenizedAsset not found: ${tokenizedAssetId}`);
    if (asset.status !== "ACTIVE") throw new Error(`Asset is not active: ${asset.status}`);
    if (asset.availableShares < shares)
      throw new Error(`Insufficient shares: available=${asset.availableShares}, requested=${shares}`);

    const totalPaid = Number(asset.pricePerShare) * shares; // in NGN

    // 2. Ensure the lead has a wallet account
    const walletAccount = await LedgerService.ensureAccount({
      id: `WALLET-${leadId.slice(0, 8)}`,
      userId: leadId,
      type: "asset",
      currency: "NGN",
    });

    // 3. Ensure an asset pool account exists
    const assetPoolAccount = await LedgerService.ensureAccount({
      id: `RWA-${tokenizedAssetId.slice(0, 8)}`,
      userId: leadId,
      type: "asset",
      currency: "NGN",
    });

    // 4. Post the ledger transaction (in kobo: totalPaid * 100)
    const totalPaidKobo = BigInt(Math.round(totalPaid * 100));
    const idempotencyKey = `RWA-${tokenizedAssetId}-${leadId}-${Date.now()}`;
    const ledgerTx = await LedgerService.postTransaction({
      userId: leadId,
      reference: idempotencyKey,
      idempotencyKey,
      description: `Purchase ${shares} shares of ${asset.name}`,
      entries: [
        {
          accountId: walletAccount.id,
          debit: totalPaidKobo,
          credit: BigInt(0),
          currency: "NGN",
          description: `Purchase ${shares} shares of ${asset.name}`,
        },
        {
          accountId: assetPoolAccount.id,
          debit: BigInt(0),
          credit: totalPaidKobo,
          currency: "NGN",
          description: `Sale of ${shares} shares of ${asset.name}`,
        },
      ],
    });

    // 5. Create token holder record
    await tx.tokenHolder.create({
      data: {
        tokenizedAssetId,
        leadId,
        shares,
        purchasePrice: asset.pricePerShare,
        totalPaid: totalPaid,
        transactionId: ledgerTx.transactionId,
      },
    });

    // 6. Update available shares
    const remaining = asset.availableShares - shares;
    await tx.tokenizedAsset.update({
      where: { id: tokenizedAssetId },
      data: {
        availableShares: { decrement: shares },
        status: remaining === 0 ? "FULLY_SUBSCRIBED" : "ACTIVE",
      },
    });

    return {
      tokenizedAssetId,
      assetName: asset.name,
      shares,
      totalPaid: totalPaid.toFixed(4),
      transactionId: ledgerTx.transactionId,
      remainingShares: remaining,
    };
  });
}

/**
 * List all active tokenized assets available for purchase.
 */
export async function listTokenizedAssets(assetType?: string) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (assetType) where.assetType = assetType;
  return prisma.tokenizedAsset.findMany({ where, orderBy: { createdAt: "desc" } });
}

/**
 * Get token holdings for a specific lead.
 */
export async function getLeadTokenHoldings(leadId: string) {
  return prisma.tokenHolder.findMany({
    where: { leadId },
    include: { tokenizedAsset: true },
    orderBy: { purchasedAt: "desc" },
  });
}
