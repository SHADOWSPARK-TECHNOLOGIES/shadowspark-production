import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/enterprise"),
  title: "Enterprise",
  description:
    "Enterprise-grade sovereign compliance deployments for high-volume financial operations — multi-channel routing, custom approval flows, and dedicated infrastructure.",
};

export default function EnterprisePage() {
  return <PageClient />;
}
