/**
 * Regulatory signal types for high-intent compliance/regulatory queries.
 * These supplement the legacy engagement signals below.
 */
export type RegulatorySignalType =
  | 'cbn_sandbox_inquiry'
  | 'sec_digital_asset_query'
  | 'nitda_data_protection_view'
  | 'nibss_interoperability_check'
  | 'sec_circular_26_1';

/**
 * All supported signal types (legacy + regulatory).
 */
export type SignalType =
  | 'pricing_page_view'
  | 'demo_requested'
  | 'whitepaper_download'
  | 'checkout_initiated'
  | 'email_opened'
  | 'email_link_clicked'
  | RegulatorySignalType;

export function evaluateIntentSignal(metadata: any): number {
  if (!metadata) return 0;
  
  let delta = 0;
  
  // Basic heuristic intent scoring
  const signalType: string = metadata.signalType || metadata.action || metadata.type;
  
  switch (signalType) {
    case 'pricing_page_view':
      delta += 5;
      break;
    case 'demo_requested':
      delta += 20;
      break;
    case 'whitepaper_download':
      delta += 10;
      break;
    case 'checkout_initiated':
      delta += 15;
      break;
    case 'email_opened':
      delta += 2;
      break;
    case 'email_link_clicked':
      delta += 5;
      break;

    // ── Regulatory signals (Phase 1 — Executive Shield) ──────────────────────
    case 'cbn_sandbox_inquiry':
      delta += 40;  // CBN Regulatory Sandbox inquiry = high intent
      break;
    case 'sec_digital_asset_query':
      delta += 50;  // SEC Digital Asset compliance = highest intent
      break;
    case 'nitda_data_protection_view':
      delta += 25;  // NITDA Data Protection
      break;
    case 'nibss_interoperability_check':
      delta += 30;  // NIBSS Payment Infrastructure
      break;
    case 'sec_circular_26_1':
      delta += 60;  // Highest intent — VASP institutional lead facing June 2027 deadline
      break;

    default:
      // Base engagement for unknown signals
      delta += 1;
  }
  
  // Bonus for deep engagement
  if (metadata.timeSpentSeconds && typeof metadata.timeSpentSeconds === 'number' && metadata.timeSpentSeconds > 60) {
    delta += 2;
  }

  return delta;
}

/**
 * Detect whether a lead is a VASP institutional lead facing the SEC 26-1 capital
 * deadline (June 2027).  Checks intent text and metadata for VASP-related keywords
 * and self-reported liquidity.
 *
 * @param intent     Free-text intent / inquiry string from the lead
 * @param metadata   Optional structured metadata (e.g. from chatbot form)
 * @returns          Detection result with estimated liquidity in kobo
 */
export function detectVaspInstitutionalLead(
  intent: string,
  metadata?: Record<string, unknown>
): {
  isVaspInstitutional: boolean;
  estimatedLiquidity: bigint | null; // in NGN kobo
  reason: string | null;
} {
  const VASP_KEYWORDS = [
    'vasp',
    'virtual asset',
    'crypto exchange',
    'digital asset exchange',
    'sec capital',
    'circular 26-1',
    'circular 26',
    '₦2 billion',
    '2000000000',
    'capital hike',
    'vasp tier',
  ];

  const normalizedIntent = intent?.toLowerCase() ?? '';
  const matchedKeyword = VASP_KEYWORDS.find((kw) => normalizedIntent.includes(kw.toLowerCase()));

  let estimatedLiquidity: bigint | null = null;
  let reason: string | null = null;

  if (matchedKeyword) {
    reason = `Intent matched VASP keyword: "${matchedKeyword}"`;
  }

  // ── Check metadata for self-reported liquidity / capital ────────────
  if (metadata) {
    // Explicit sec_circular_26_1 regulatory signal
    const regulatorySignals = metadata.regulatorySignals as
      | string[]
      | undefined;
    if (
      Array.isArray(regulatorySignals) &&
      regulatorySignals.includes('sec_circular_26_1')
    ) {
      reason = 'Lead has sec_circular_26_1 regulatory signal in metadata';
    }

    // Self-reported liquidity (in kobo or Naira)
    const rawLiquidity =
      (metadata.liquidityKobo as number | undefined) ??
      (metadata.liquidity as number | undefined) ??
      (metadata.capital as number | undefined) ??
      (metadata.estimatedLiquidity as number | undefined);

    if (typeof rawLiquidity === 'number' && rawLiquidity > 0) {
      // Assume raw value is in kobo; if in Naira (suspiciously small for kobo),
      // convert.  Liquidity >= 2B Naira = 200_000_000_000 kobo.
      const liquidityKobo = rawLiquidity < 1_000_000 ? rawLiquidity * 100 : rawLiquidity;
      estimatedLiquidity = BigInt(liquidityKobo);
      if (!reason) {
        reason = `Self-reported liquidity: ₦${(Number(liquidityKobo) / 100).toLocaleString()}`;
      }
    }
  }

  // Determine VASP institutional status
  const THRESHOLD_KOBO = BigInt(200_000_000_000); // ₦2,000,000,000.00
  const isVaspInstitutional =
    (matchedKeyword !== undefined && estimatedLiquidity !== null && estimatedLiquidity >= THRESHOLD_KOBO) ||
    (reason !== null); // If we have any VASP-related reason, treat as institutional

  return {
    isVaspInstitutional,
    estimatedLiquidity,
    reason,
  };
}
