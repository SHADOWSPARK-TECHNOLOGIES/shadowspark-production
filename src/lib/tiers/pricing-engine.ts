import { detectRegulatorySignal } from '@/lib/scoring/firecrawl-signals';

/**
 * Assigns a pricing tier based on the lead score, optionally factoring in
 * an HNW (High-Net-Worth) relevance modifier.
 *
 * The HNW modifier boosts the effective score by up to 15 points:
 *   effectiveScore = min(100, score + round(hnwRelevance × 15))
 *
 * @param score          The base lead score (0–100)
 * @param hnwRelevance   Optional HNW relevance factor (0 to 1)
 * @returns              'starter' | 'pro' | 'enterprise'
 */
export function assignTier(
  score: number,
  hnwRelevance?: number,
): 'starter' | 'pro' | 'enterprise' {
  const effectiveScore =
    hnwRelevance !== undefined
      ? Math.min(100, score + Math.round(hnwRelevance * 15))
      : score;

  // If the intent carries a regulatory signal, apply an additional bonus
  // via the Firecrawl bridge (handled upstream; no extra call here).

  if (effectiveScore >= 80) return 'enterprise';
  if (effectiveScore >= 50) return 'pro';
  return 'starter';
}
