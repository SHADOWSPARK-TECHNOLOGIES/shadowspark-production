import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/industries"),
  title: "Industries",
  description:
    "ShadowSpark sovereign compliance solutions for Real Estate, Logistics, Healthcare, Education, Professional Services, and Hospitality in Nigeria.",
};

export default function IndustriesPage() {
  return <PageClient />;
}
