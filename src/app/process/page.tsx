import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/process"),
  title: "Process",
  description:
    "ShadowSpark's structured deployment process — from qualification and tailored audit to demo deployment, approval, and managed launch.",
};

export default function ProcessPage() {
  return <PageClient />;
}
