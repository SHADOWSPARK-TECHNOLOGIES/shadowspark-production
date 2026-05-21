import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  ...canonical("/contact"),
  title: "Contact",
  description:
    "Contact ShadowSpark — get in touch with our team for inquiries about sovereign compliance infrastructure, enterprise deployments, and partnership opportunities.",
};

export default function ContactPage() {
  return <PageClient />;
}
