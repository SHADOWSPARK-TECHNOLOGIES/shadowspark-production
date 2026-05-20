/**
 * Reusable SEO helpers for ShadowSpark marketing pages.
 *
 * Provides:
 *  - `canonical(path)` — returns metadataBase + alternates.canonical for a path
 *  - `organizationJsonLd()` — returns Organization structured data as a JSON string
 *  - `faqJsonLd(items)` — returns FAQPage structured data as a JSON string
 */

const BASE_URL = "https://shadowspark.tech";

/** Organization name used across all structured data. */
const ORG_NAME = "ShadowSpark Technologies";

/**
 * Build canonical metadata for a given pathname.
 *
 * Usage in page metadata:
 * ```ts
 * export const metadata: Metadata = {
 *   ...canonical("/about"),
 *   title: "...",
 * };
 * ```
 */
export function canonical(path: string): {
  metadataBase: URL;
  alternates: { canonical: string };
} {
  const url = new URL(path, BASE_URL);
  return {
    metadataBase: new URL(BASE_URL),
    alternates: { canonical: url.href },
  };
}

/**
 * Returns a JSON string for Organization structured data.
 * Render in the root layout or marketing layout via:
 * ```tsx
 * <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJsonLd() }} />
 * ```
 */
export function organizationJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    description:
      "Institutional-grade financial infrastructure for High-Net-Worth liquidity movers in the 2026 Lagos market. Real-time ledger transparency, automated regulatory compliance, and AI-powered treasury operations.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
    },
    sameAs: [],
  });
}

/**
 * Returns a JSON string for FAQPage structured data.
 *
 * @param items — Array of { question, answer } pairs.
 *
 * Usage:
 * ```tsx
 * <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(items) }} />
 * ```
 */
export function faqJsonLd(
  items: { question: string; answer: string }[],
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}
