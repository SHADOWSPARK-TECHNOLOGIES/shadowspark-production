import type { Metadata } from "next";

/**
 * Marketing section base metadata.
 * Individual pages can override these values via their own metadata exports.
 */
export const metadata: Metadata = {
  title: {
    default: "Shadowspark — Sovereign Financial Node",
    template: "%s | Shadowspark",
  },
  description:
    "Institutional-grade financial infrastructure for High-Net-Worth liquidity movers in the 2026 Lagos market.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
