import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your ShadowSpark Technologies account to access your dashboard, manage automations, and review performance analytics.",
  openGraph: {
    title: "Sign In | ShadowSpark",
    description: "Sign in to your ShadowSpark Technologies account.",
    url: "https://shadowspark-tech.org/login",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
