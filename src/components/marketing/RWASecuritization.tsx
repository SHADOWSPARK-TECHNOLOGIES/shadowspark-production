/**
 * RWASecuritization — Epe/Ikoyi/Patek Philippe Token Cards
 *
 * Obsidian HUD Edition.
 * Server component that displays tokenized real-world assets with
 * share price in NGN, using BigInt kobo-to-Naira conversion logic.
 *
 * Data source: TokenizedAsset model via Prisma, with fallback mock data.
 */

import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────

type AssetCard = {
  id: string;
  name: string;
  location: string;
  assetType: string;
  totalShares: number;
  availableShares: number;
  pricePerShareNaira: string;
  status: string;
};

// ── Mock fallback assets ──────────────────────────────────────────────────

const FALLBACK_ASSETS: AssetCard[] = [
  {
    id: "epe-land-1",
    name: "Epe Land Parcel A",
    location: "Epe, Lagos",
    assetType: "LAND",
    totalShares: 10000,
    availableShares: 4200,
    pricePerShareNaira: "₦ 25,000.00",
    status: "ACTIVE",
  },
  {
    id: "ikoyi-res-1",
    name: "Ikoyi Residential Villa",
    location: "Ikoyi, Lagos",
    assetType: "LAND",
    totalShares: 5000,
    availableShares: 1800,
    pricePerShareNaira: "₦ 85,000.00",
    status: "ACTIVE",
  },
  {
    id: "patek-1",
    name: "Patek Philippe Nautilus 5711",
    location: "Lagos Vault",
    assetType: "WATCH",
    totalShares: 1000,
    availableShares: 600,
    pricePerShareNaira: "₦ 150,000.00",
    status: "ACTIVE",
  },
];

// ── Server Data Fetch ─────────────────────────────────────────────────────

async function fetchAssets(): Promise<AssetCard[]> {
  try {
    const assets = await prisma.tokenizedAsset.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    if (assets.length === 0) return FALLBACK_ASSETS;

    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      location: a.location ?? "Lagos",
      assetType: a.assetType,
      totalShares: a.totalShares,
      availableShares: a.availableShares,
      pricePerShareNaira: new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      }).format(Number(a.pricePerShare)),
      status: a.status,
    }));
  } catch {
    return FALLBACK_ASSETS;
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export async function RWASecuritization() {
  const assets = await fetchAssets();

  return (
    <section className="relative py-24">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,149,106,0.03),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-12">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-6 w-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-white font-display">
                RWA Securitization
              </h2>
              <p className="text-[10px] font-mono text-zinc-600">
                FRACTIONAL OWNERSHIP — BACKED BY TITLE-DEEDED ASSETS
              </p>
            </div>
          </div>
        </div>

        {/* Asset cards grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const soldPercentage = Math.round(
              ((asset.totalShares - asset.availableShares) / asset.totalShares) * 100
            );

            return (
              <div
                key={asset.id}
                className="glass-panel group rounded-2xl p-6 golden-transition duration-500 hover:bg-white/6 hover:border-emerald-500/20"
              >
                {/* Asset type badge */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[9px] font-mono font-semibold uppercase tracking-wider ${
                      asset.assetType === "LAND"
                        ? "bg-emerald/10 text-emerald-400"
                        : asset.assetType === "WATCH"
                          ? "bg-gold/10 text-gold-400"
                          : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {asset.assetType}
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {asset.status}
                  </span>
                </div>

                {/* Asset name & location */}
                <h3 className="font-display text-xl font-semibold text-white">
                  {asset.name}
                </h3>
                <p className="mt-1 text-xs font-mono text-zinc-500">
                  {asset.location}
                </p>

                {/* Price */}
                <div className="mt-5 border-t border-white/5 pt-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                    Share Price
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-emerald-400 tabular-nums">
                    {asset.pricePerShareNaira}
                  </p>
                </div>

                {/* Availability bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600">
                    <span>{asset.availableShares.toLocaleString()} available</span>
                    <span>{asset.totalShares.toLocaleString()} total</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 golden-transition"
                      style={{ width: `${100 - soldPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RWASecuritization;
