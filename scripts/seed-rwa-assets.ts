#!/usr/bin/env tsx
/**
 * RWA Tokenized Asset Seeder
 *
 * Seeds 6 tokenized real-world assets:
 *   - 3 Land parcels (Epe, Ikoyi, Banana Island)
 *   - 2 Luxury watches (Patek Philippe, Rolex Daytona)
 *   - 1 Credit instrument (Lagos Infrastructure Bond)
 *
 * Usage:
 *   pnpm seed:rwa
 */

import { prisma } from "@/lib/prisma";

const ASSETS = [
  {
    name: "Epe Coastal Development Parcel A",
    assetType: "LAND",
    location: "Epe",
    totalShares: 10000,
    pricePerShare: 250000.0000,
  },
  {
    name: "Ikoyi Luxury Residential Plot 7B",
    assetType: "LAND",
    location: "Ikoyi",
    totalShares: 5000,
    pricePerShare: 850000.0000,
  },
  {
    name: "Banana Island Waterfront Lot 3",
    assetType: "LAND",
    location: "Banana Island",
    totalShares: 3000,
    pricePerShare: 1200000.0000,
  },
  {
    name: "Patek Philippe Nautilus 5711/1A-018",
    assetType: "WATCH",
    location: null,
    totalShares: 500,
    pricePerShare: 45000.0000,
  },
  {
    name: "Rolex Daytona Paul Newman 6239",
    assetType: "WATCH",
    location: null,
    totalShares: 250,
    pricePerShare: 95000.0000,
  },
  {
    name: "Lagos Infrastructure Bond Series 5",
    assetType: "CREDIT",
    location: null,
    totalShares: 50000,
    pricePerShare: 5000.0000,
  },
];

function getDescription(name: string): string {
  const descs: Record<string, string> = {
    "Epe Coastal Development Parcel A":
      "Prime coastal development land in Epe, Lagos State. Zoned for mixed-use commercial and residential development. 5km from Lekki-Epe Expressway.",
    "Ikoyi Luxury Residential Plot 7B":
      "Premium residential plot in Ikoyi, Lagos. Located on Bourdillon Road. Approved for 3-story luxury villa. Title deed verified by Lagos State Land Registry.",
    "Banana Island Waterfront Lot 3":
      "Exclusive waterfront plot on Banana Island, Ikoyi. Direct lagoon access. Approved for luxury waterfront development with private jetty.",
    "Patek Philippe Nautilus 5711/1A-018":
      "Limited edition Patek Philippe Nautilus ref. 5711/1A-018 in stainless steel. Discontinued model. Authenticated by Geneva-based horological experts.",
    "Rolex Daytona Paul Newman 6239":
      "Vintage Rolex Daytona 'Paul Newman' ref. 6239. Exceedingly rare exotic dial variant. Authenticated and appraised by Sotheby's Watch Division.",
    "Lagos Infrastructure Bond Series 5":
      "Lagos State Government Infrastructure Bond Series 5. 10-year tenor at 8.5% per annum. Guaranteed by Lagos State Ministry of Finance. Minimum holding period: 12 months.",
  };
  return descs[name] || "Tokenized real-world asset on Shadowspark RWA platform.";
}

async function main() {
  console.log("🌱 Seeding RWA tokenized assets...");

  for (const asset of ASSETS) {
    const assetId = asset.name.toLowerCase().replace(/\s+/g, "-");

    await prisma.tokenizedAsset.upsert({
      where: { id: assetId },
      update: {},
      create: {
        id: assetId,
        name: asset.name,
        assetType: asset.assetType,
        location: asset.location,
        totalShares: asset.totalShares,
        availableShares: asset.totalShares,
        pricePerShare: asset.pricePerShare,
        currency: "NGN",
        status: "ACTIVE",
        metadata: {
          description: getDescription(asset.name),
          appraisalDate: "2026-04-01",
        },
      },
    });

    console.log(
      `  ✅ ${asset.name} — ${asset.totalShares.toLocaleString()} shares @ ₦${asset.pricePerShare.toLocaleString()}/share`
    );
  }

  const count = await prisma.tokenizedAsset.count();
  console.log(`✅ Done. ${count} tokenized assets seeded.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
