/**
 * Firecrawl Semantic Bridge
 *
 * Parses lead intents against regulatory keyword clusters derived from
 * the Firecrawl knowledge base to produce proportional scoring bonuses.
 *
 * Data sources (ingested via Firecrawl):
 *   - CBN:   Regulatory sandbox, open banking, PSB, digital banking/lending,
 *            cybersecurity framework, contactless payments, forex liberalization
 *   - SEC:   Digital asset rules, ARIP, crypto exchange licensing, VASP capital
 *   - NITDA: Nigeria Data Protection Act 2023 (replaced NDPR), NDPC, breach
 *            notification, cross-border data transfer
 *   - NIBSS: NIP real-time transfers, NEFT batch settlements, National Central
 *            Switch interoperability, BVN, transaction switching
 *
 * Phase 2 — Executive Shield
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Multiplier applied to confidence to compute final score bonus. */
const RRF_MULTIPLIER = 30;

/** Minimum keyword matches required within a single cluster to trigger detection. */
const MIN_MATCH_THRESHOLD = 1;

// ── Data structure for regulatory keyword clusters ─────────────────────────

interface RegulatoryCluster {
  /** Case-insensitive keywords to match against lead intent text. */
  keywords: string[];
  /** Canonical signal type emitted when this cluster is matched. */
  signalType: RegulatorySignalType;
  /**
   * Base bonus (0–100) assigned to this cluster. Used as a weight when
   * multiple clusters match: final bonus = (clusterBonus / sum(allBonuses))
   * × RRF_MULTIPLIER. This ensures proportional scoring across regulators.
   */
  baseBonus: number;
  /** Human-readable description of what this cluster represents. */
  description: string;
}

// ── Regulatory signal types ─────────────────────────────────────────────────

export type RegulatorySignalType =
  | 'cbn_sandbox_inquiry'
  | 'sec_digital_asset_query'
  | 'nitda_data_protection_view'
  | 'nibss_interoperability_check'
  | 'sec_circular_26_1';

// ── Keyword clusters sourced from Firecrawl knowledge base ──────────────────

const REGULATORY_SIGNALS: Record<string, RegulatoryCluster> = {
  /**
   * CBN (Central Bank of Nigeria) — Sandbox, Open Banking, PSB, Digital
   * Lending, Cybersecurity, Contactless Payments, Forex Liberalization.
   *
   * Source: Firecrawl chunks 2001–2010
   * Base bonus rationale: Moderate (40) — broad fintech applicability but
   * lower per-lead conversion value vs. SEC digital asset queries.
   */
  cbn: {
    keywords: [
      'cbn',
      'central bank',
      'regulatory sandbox',
      'open banking',
      'payment service bank',
      'psb license',
      'digital banking',
      'digital lending',
      'cybersecurity framework',
      'contactless payments',
      'forex liberalization',
      'nafem',
      'nigerian banking',
      'risk based cybersecurity',
      'digital lending capital',
      'interest rate cap',
      'loan recovery',
      'contactless pin',
    ],
    signalType: 'cbn_sandbox_inquiry',
    baseBonus: 40,
    description: 'CBN regulatory sandbox, open banking, or PSB inquiry',
  },

  /**
   * SEC Nigeria — Digital Asset Rules, ARIP, Crypto Exchange Licensing,
   * VASP Capital Requirements, Tokenized Asset Registration.
   *
   * Source: Firecrawl chunks 3001–3002
   * Base bonus rationale: High (50) — digital asset queries strongly correlate
   * with institutional capital and high-ticket conversation value.
   */
  sec: {
    keywords: [
      'sec',
      'securities exchange',
      'digital asset',
      'crypto license',
      'arip',
      'accelerated regulatory incubation',
      'investment platform',
      'tokenized',
      'blockchain compliance',
      'digital asset registration',
      'digital asset exchange',
      'crypto exchange',
      'virtual asset',
      'vasp',
      'n500 million',
      '500 million capital',
    ],
    signalType: 'sec_digital_asset_query',
    baseBonus: 50,
    description: 'SEC digital asset or VASP compliance inquiry',
  },

  /**
   * NITDA / NDPC — Nigeria Data Protection Act 2023 (replaced NDPR),
   * Data Protection Impact Assessment (DPIA), Breach Notification,
   * Cross-Border Data Transfer, Data Protection Officer (DPO).
   *
   * Source: Firecrawl chunks 4001–4002
   * Base bonus rationale: Low–Moderate (25) — necessary compliance but
   * lower direct revenue signal; often a secondary concern.
   *
   * NOTE: The original NDPR has been superseded by the Nigeria Data
   * Protection Act 2023. The NDPC is now the independent regulator.
   */
  nitda: {
    keywords: [
      'nitda',
      'data protection',
      'data privacy',
      'ndpr',
      'nigerian data protection',
      'compliance officer',
      'data audit',
      'dpia',
      'data protection impact assessment',
      'ndpc',
      'data protection commission',
      'data breach notification',
      '72 hours',
      'cross-border data transfer',
      'dpo',
      'data protection officer',
    ],
    signalType: 'nitda_data_protection_view',
    baseBonus: 25,
    description: 'NITDA / NDPC data protection compliance inquiry',
  },

  /**
   * NIBSS — Nigeria Inter-Bank Settlement System, NIP Real-Time Transfers,
   * NEFT Batch Settlements, National Central Switch Interoperability,
   * BVN Verification, Transaction Switching.
   *
   * Source: Firecrawl chunk 5001
   * Base bonus rationale: Moderate (30) — payment infrastructure interest
   * signals operational readiness and integration needs.
   */
  nibss: {
    keywords: [
      'nibss',
      'nip',
      'neft',
      'interoperability',
      'national central switch',
      'payment infrastructure',
      'bank verification',
      'bvn',
      'transaction switching',
      'batch settlement',
      'settlement timelines',
      'real-time transfer',
      'payment switching',
    ],
    signalType: 'nibss_interoperability_check',
    baseBonus: 30,
    description: 'NIBSS payment infrastructure or interoperability inquiry',
  },

  /**
   * SEC Circular 26-1 — VASP Institutional Capital Deadline (June 2027).
   * The highest-value regulatory signal: leads facing the ₦2B capital
   * deadline are actively seeking compliant custody/treasury solutions.
   *
   * Source: SEC Nigeria circular 26-1 (VASP capital hike)
   * Base bonus rationale: Very High (60) — strongest conversion predictor
   * for enterprise treasury product.
   */
  secCircular261: {
    keywords: [
      'sec circular 26',
      'circular 26-1',
      'vasp tier',
      'vasp capital',
      'virtual asset capital',
      'n2 billion',
      '2 billion capital',
      '2000000000',
      'capital hike',
      'vasp deadline',
      'june 2027',
      'sec capital requirement',
    ],
    signalType: 'sec_circular_26_1',
    baseBonus: 60,
    description: 'SEC Circular 26-1 VASP institutional capital deadline inquiry',
  },
};

// ── Exported types ──────────────────────────────────────────────────────────

export interface RegulatorySignalResult {
  signalType: string;
  confidence: number;
  bonus: number;
}

/**
 * Extended result returned when multiple regulatory clusters match.
 * Used by `detectAllRegulatorySignals()` for multi-signal aggregation.
 */
export interface MultiRegulatorySignalResult {
  signals: RegulatorySignalResult[];
  combinedBonus: number;
}

// ── Tokenization helpers ────────────────────────────────────────────────────

/**
 * Normalizes intent text for matching.
 * - Lowercases
 * - Strips leading/trailing whitespace
 * - Normalizes Unicode (NFKC) to handle varied character encodings
 */
function normalizeIntent(intent: string): string {
  return intent.toLowerCase().normalize('NFKC').trim();
}

/**
 * Tokenizes normalized intent into word tokens.
 */
function tokenize(intent: string): string[] {
  return intent.split(/\s+/).filter(Boolean);
}

// ── Core detection logic ────────────────────────────────────────────────────

/**
 * Counts how many keywords from a cluster match a given intent.
 *
 * Multi-word keywords (containing spaces) are checked via substring
 * containment on the full normalized intent. Single-word keywords are
 * checked against the tokenized word list for exact token-level match.
 *
 * @param normalizedIntent  Pre-normalized intent text
 * @param tokens            Pre-tokenized word list
 * @param cluster           The regulatory cluster to test against
 * @returns                 Number of matched keywords (0 = no match)
 */
function countKeywordMatches(
  normalizedIntent: string,
  tokens: string[],
  cluster: RegulatoryCluster,
): number {
  let matchedCount = 0;

  for (const keyword of cluster.keywords) {
    if (keyword.includes(' ')) {
      // Multi-word keyword: check substring containment on full intent
      if (normalizedIntent.includes(keyword)) {
        matchedCount++;
      }
    } else {
      // Single-word keyword: exact token-level match
      if (tokens.includes(keyword)) {
        matchedCount++;
      }
    }
  }

  return matchedCount;
}

/**
 * Detects the single strongest regulatory signal from the lead intent.
 *
 * Iterates all clusters and returns the one with the highest proportional
 * confidence × baseBonus product. This replaces the previous first-match
 * behavior which could miss a stronger signal from a later cluster.
 *
 * @param intent  The raw intent / query text from a lead
 * @returns       The best-matched signal (with confidence & bonus) or null
 */
export function detectRegulatorySignal(
  intent: string,
): RegulatorySignalResult | null {
  if (!intent || typeof intent !== 'string') return null;

  const normalizedIntent = normalizeIntent(intent);
  const tokens = tokenize(normalizedIntent);

  let bestResult: RegulatorySignalResult | null = null;
  let bestScore = -1;

  for (const cluster of Object.values(REGULATORY_SIGNALS)) {
    const matchedCount = countKeywordMatches(normalizedIntent, tokens, cluster);

    if (matchedCount < MIN_MATCH_THRESHOLD) continue;

    const confidence = matchedCount / cluster.keywords.length;
    // Weighted score: higher baseBonus clusters get priority when
    // confidence is similar
    const weightedScore = confidence * cluster.baseBonus;

    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestResult = {
        signalType: cluster.signalType,
        confidence: Math.round(confidence * 100) / 100, // round to 2 decimals
        bonus: Math.round(cluster.baseBonus * confidence),
      };
    }
  }

  return bestResult;
}

/**
 * Detects ALL matching regulatory signals from the lead intent.
 *
 * Unlike `detectRegulatorySignal()` which returns the single best match,
 * this returns every cluster that has at least one keyword match. This is
 * useful for multi-regulator leads (e.g., "I need a CBN lending license
 * and a SEC digital asset license").
 *
 * Combined bonus is computed as weighted average of all matched clusters:
 *   combinedBonus = Σ(matched.bonus) / Σ(all.baseBonus) × RRF_MULTIPLIER
 *
 * @param intent  The raw intent / query text from a lead
 * @returns       All matched signals with combined bonus, or null if none
 */
export function detectAllRegulatorySignals(
  intent: string,
): MultiRegulatorySignalResult | null {
  if (!intent || typeof intent !== 'string') return null;

  const normalizedIntent = normalizeIntent(intent);
  const tokens = tokenize(normalizedIntent);

  const matchedSignals: RegulatorySignalResult[] = [];

  for (const cluster of Object.values(REGULATORY_SIGNALS)) {
    const matchedCount = countKeywordMatches(normalizedIntent, tokens, cluster);

    if (matchedCount < MIN_MATCH_THRESHOLD) continue;

    const confidence = matchedCount / cluster.keywords.length;
    matchedSignals.push({
      signalType: cluster.signalType,
      confidence: Math.round(confidence * 100) / 100,
      bonus: Math.round(cluster.baseBonus * confidence),
    });
  }

  if (matchedSignals.length === 0) return null;

  // Combined bonus: weighted proportional score across all matched clusters
  const totalMatchedBonus = matchedSignals.reduce(
    (sum, s) => sum + s.bonus,
    0,
  );
  const totalBaseBonus = Object.values(REGULATORY_SIGNALS).reduce(
    (sum, c) => sum + c.baseBonus,
    0,
  );
  const combinedBonus = Math.round(
    (totalMatchedBonus / totalBaseBonus) * RRF_MULTIPLIER,
  );

  return {
    signals: matchedSignals,
    combinedBonus,
  };
}

/**
 * Evaluates the regulatory impact of an intent on a base score.
 *
 * Uses the RRF (Reciprocal Rank Fusion) style formula:
 *   Score_final = Score_base + min(combinedBonus, RRF_MULTIPLIER)
 *
 * The combined bonus is capped at RRF_MULTIPLIER (30 points) to prevent
 * regulatory signals from overwhelming the base engagement score, while
 * still providing meaningful differentiation.
 *
 * @param intent     The raw intent / query text
 * @param baseScore  The current score before regulatory bonus (0–100)
 * @returns          Modified score clamped to [0, 100]
 */
export function evaluateRegulatoryImpact(
  intent: string,
  baseScore: number,
): number {
  if (typeof baseScore !== 'number' || Number.isNaN(baseScore)) return 0;

  const allSignals = detectAllRegulatorySignals(intent);

  if (!allSignals) return Math.max(0, Math.min(100, baseScore));

  // Apply combined bonus capped at RRF_MULTIPLIER
  const cappedBonus = Math.min(allSignals.combinedBonus, RRF_MULTIPLIER);
  const scoreFinal = baseScore + cappedBonus;

  return Math.max(0, Math.min(100, scoreFinal));
}

/**
 * Returns the primary regulatory signal type string for a given intent,
 * or null if no regulatory match is found.
 *
 * This is a convenience wrapper around `detectRegulatorySignal()` for
 * callers that only need the signal type label (e.g., tagging leads).
 *
 * @param intent  The raw intent / query text
 * @returns       The signal type string or null
 */
export function getRegulatorySignalType(intent: string): string | null {
  const signal = detectRegulatorySignal(intent);
  return signal ? signal.signalType : null;
}

/**
 * Returns ALL regulatory signal types detected in the intent.
 *
 * Useful for multi-tagging leads (e.g., a lead can be both
 * "cbn_sandbox_inquiry" and "sec_digital_asset_query").
 *
 * @param intent  The raw intent / query text
 * @returns       Array of matching signal type strings (empty if none)
 */
export function getAllRegulatorySignalTypes(intent: string): string[] {
  const result = detectAllRegulatorySignals(intent);
  return result ? result.signals.map((s) => s.signalType) : [];
}

/**
 * Builds a human-readable summary of all regulatory signals detected.
 *
 * @param intent  The raw intent / query text
 * @returns       A formatted string (e.g., "CBN sandbox inquiry; SEC digital asset query")
 *                or "No regulatory signals detected"
 */
export function summarizeRegulatorySignals(intent: string): string {
  const result = detectAllRegulatorySignals(intent);
  if (!result || result.signals.length === 0) {
    return 'No regulatory signals detected';
  }

  const clusterMap = Object.values(REGULATORY_SIGNALS);
  const descriptions = result.signals.map((signal) => {
    const cluster = clusterMap.find(
      (c) => c.signalType === signal.signalType,
    );
    return cluster
      ? `${cluster.description} (confidence: ${(signal.confidence * 100).toFixed(0)}%)`
      : `${signal.signalType} (confidence: ${(signal.confidence * 100).toFixed(0)}%)`;
  });

  return descriptions.join('; ');
}
