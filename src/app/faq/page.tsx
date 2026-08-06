import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/faq"),
  title: "FAQ",
  description:
    "Frequently asked questions about ShadowSpark sovereign compliance infrastructure — pricing, deployment, integrations, and support.",
};

export default function FAQPage() {
  return <PageClient />;
}
