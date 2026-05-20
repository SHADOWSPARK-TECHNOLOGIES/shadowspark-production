import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/solutions"),
  title: "Solutions",
  description:
    "ShadowSpark's layered compliance infrastructure — from Presence Infrastructure to AI-Native Compliance and RWA Securitization for Nigerian financial institutions.",
};

export default function SolutionsPage() {
  return <PageClient />;
}
