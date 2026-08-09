import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import { Toaster } from "sonner";
import { organizationJsonLd } from "@/lib/seo";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shadowspark.tech"),
  title: "Shadowspark — Sovereign Financial Node",
  description:
    "Institutional-grade financial infrastructure for High-Net-Worth liquidity movers in the 2026 Lagos market. Real-time ledger transparency, automated regulatory compliance, and AI-powered treasury operations.",
  keywords: [
    "sovereign wealth",
    "financial infrastructure",
    "Lagos market",
    "regulatory compliance",
    "double-entry ledger",
    "HNW liquidity",
    "SEC Circular 26-1",
    "VASP compliance",
    "Nigeria fintech",
    "tokenized assets",
  ],
  openGraph: {
    title: "Shadowspark — Sovereign Financial Node",
    description:
      "Total Visibility. Mathematical Certainty. Sovereign Wealth. Institutional infrastructure for the 2026 Lagos market.",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadowspark — Sovereign Financial Node",
    description:
      "Total Visibility. Mathematical Certainty. Sovereign Wealth.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {/* Organization JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd() }}
        />
        {/* Skip-to-content link for keyboard and screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Toaster theme="dark" position="bottom-right" />
        <ChatWidget />
      </body>
    </html>
  );
}
