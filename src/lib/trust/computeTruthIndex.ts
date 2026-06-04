import { TrustComponent } from "@/generated/prisma/client"
import type { ExtendedPrismaClient } from "@/lib/prisma"

export const DEFAULT_TRUST_COMPONENTS = [
  { key: 'title_document',       label: 'Title Document Verified',     weight: 30 },
  { key: 'landlord_identity',    label: 'Landlord Identity Confirmed',  weight: 25 },
  { key: 'agent_physical_visit', label: 'Agent Physical Inspection',    weight: 20 },
  { key: 'price_market_check',   label: 'Price Market Validated',       weight: 10 },
  { key: 'no_active_disputes',   label: 'No Active Disputes on Record', weight: 10 },
  { key: 'legal_consent',        label: 'Legal Consent on File',        weight: 5  },
] as const

export function computeTruthIndex(components: TrustComponent[]): number {
  if (!components.length) return 0
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)
  const earnedWeight = components
    .filter(c => c.passed)
    .reduce((sum, c) => sum + c.weight, 0)
  return Math.round((earnedWeight / totalWeight) * 100)
}

export async function syncTruthIndex(
  listingId: string,
  prisma: ExtendedPrismaClient
): Promise<number> {
  const components = await prisma.trustComponent.findMany({
    where: { listingId }
  })
  const score = computeTruthIndex(components)
  await prisma.listing.update({
    where: { id: listingId },
    data: { truthIndex: score }
  })
  return score
}

export async function initializeTrustComponents(
  listingId: string,
  prisma: ExtendedPrismaClient
): Promise<void> {
  const existing = await prisma.trustComponent.count({
    where: { listingId }
  })
  if (existing > 0) return
  await prisma.trustComponent.createMany({
    data: DEFAULT_TRUST_COMPONENTS.map(c => ({
      listingId,
      componentKey: c.key,
      label: c.label,
      weight: c.weight,
      passed: false,
    })),
    skipDuplicates: true,
  })
}
