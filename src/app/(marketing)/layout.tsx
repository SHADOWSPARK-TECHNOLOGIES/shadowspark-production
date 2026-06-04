import type { Metadata } from "next";

/**
 * Marketing section base metadata.
 * Individual pages can override these values via their own metadata exports.
 */
export const metadata: Metadata = {
  title: {
    default: "ShadowSpark Technologies — Nigerian AI Agency",
    template: "%s | ShadowSpark",
  },
  description:
    "We design and build AI-powered products for Nigerian businesses. Production systems, not slides.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
