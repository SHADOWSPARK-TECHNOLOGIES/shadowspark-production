import type { Metadata } from "next";
import DashboardPageClient from "./PageClient";

export const metadata: Metadata = {
  title: "Dashboard — ShadowSpark",
  description: "Your ShadowSpark command centre",
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
