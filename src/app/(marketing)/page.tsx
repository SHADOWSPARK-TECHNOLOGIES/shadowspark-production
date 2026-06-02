import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import HomeClient from "./HomeClient";
import "./home.css";

export const metadata: Metadata = {
  ...canonical("/"),
  title: "Stephen Okoronkwo — Founder, ShadowSpark Technologies",
  description:
    "ShadowSpark Technologies builds production-grade AI systems, fintech infrastructure, and cloud-native platforms. Expert software architecture from Owerri to the world.",
  openGraph: {
    title: "ShadowSpark Technologies",
    description: "AI-powered software architecture & fintech engineering",
    type: "website",
  },
};

/**
 * ShadowSpark Technologies marketing homepage.
 *
 * Ported 1:1 from the static design in Downloads/shadowspark.html. The full
 * markup + behaviour lives in the HomeClient island; styling is in home.css.
 * This server component only owns the route's metadata. The previous
 * "Sovereign Financial Node" terminal is preserved in page.tsx.sovereign.bak.
 */
export default function HomePage() {
  return <HomeClient />;
}
