import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonical("/cookies"),
  title: "Cookie Policy",
  description:
    "Cookie Policy for ShadowSpark — how we use essential, analytics, and functional cookies on our sovereign compliance platform.",
};

import Link from "next/link";
import { ArrowLeft, Shield, Cookie, Sliders, RefreshCw, Globe, Mail } from "lucide-react";

const sections = [
  {
    id: "what-are-cookies",
    title: "1. What Are Cookies",
    icon: Cookie,
    content:
      "Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, enhance user experience, and provide information to website owners. Cookies may be set by the website you visit ('first-party cookies') or by third-party services integrated into the website ('third-party cookies').",
  },
  {
    id: "how-we-use",
    title: "2. How We Use Cookies",
    icon: Sliders,
    content: [
      "ShadowSpark uses cookies and similar technologies for the following purposes:",
      "Essential Cookies — These cookies are necessary for the Platform to function properly. They enable core functionality such as security, authentication, and session management. Without these cookies, certain services cannot be provided.",
      "Analytics Cookies — These cookies help us understand how users interact with the Platform by collecting and reporting information about usage patterns. We use this data to improve performance, optimize user experience, and identify areas for enhancement.",
      "Functional Cookies — These cookies enable enhanced functionality and personalization, such as remembering your preferences, language settings, and login status across sessions.",
    ],
  },
  {
    id: "types-of-cookies",
    title: "3. Types of Cookies We Use",
    icon: RefreshCw,
    content: [
      "The following table describes the specific cookies we use on the Platform:",
      "Session Cookies — Temporary cookies that expire when you close your browser. Used for authentication and session management. Duration: Session only.",
      "Persistent Cookies — These cookies remain on your device for a set period or until you delete them. Used to remember your preferences and login status. Duration: Up to 12 months.",
      "Analytics Cookies — Set by our analytics providers to collect aggregated usage data. These cookies do not identify you personally. Duration: Up to 24 months.",
      "Preference Cookies — Store your settings and customization choices. Duration: Up to 12 months.",
    ],
  },
  {
    id: "managing-cookies",
    title: "4. Managing Cookies",
    icon: Shield,
    content:
      "You have the right to control and manage cookies on your device. Most web browsers allow you to view, block, or delete cookies through their settings. Please note that blocking essential cookies may impact the functionality of the Platform and may prevent you from accessing certain features. You can typically find cookie management options in your browser's 'Settings', 'Privacy', or 'Preferences' menu. For detailed instructions, refer to your browser's help documentation.",
  },
  {
    id: "third-party",
    title: "5. Third-Party Cookies",
    icon: Globe,
    content:
      "We may allow carefully selected third-party service providers to set cookies on the Platform for analytics and performance monitoring purposes. These third parties include analytics platforms and infrastructure monitoring services. These third parties are contractually obligated to use your data only for the purposes specified by ShadowSpark and in accordance with applicable data protection laws. We do not allow advertising or tracking cookies from third-party advertisers on the Platform.",
  },
  {
    id: "updates",
    title: "6. Updates to This Policy",
    icon: RefreshCw,
    content:
      "We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. When we make material changes, we will notify you by updating the 'Last updated' date at the top of this policy and, where appropriate, through in-platform notifications. We encourage you to review this policy periodically to stay informed about how we use cookies.",
  },
  {
    id: "contact",
    title: "7. Contact",
    icon: Mail,
    content:
      "If you have any questions about our use of cookies or this Cookie Policy, please contact us at privacy@shadowspark.tech or through our WhatsApp Business line.",
  },
];

export default function CookiesPage() {
  return (
    <main className="bg-obsidian min-h-screen font-sans text-zinc-400 selection:bg-emerald-500/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800 px-6 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[200px]" />
          <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-gold-500/3 blur-[160px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 text-[11px] font-mono tracking-[0.22em] text-emerald-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            COOKIES
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Cookie Policy
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            How ShadowSpark uses cookies and similar technologies
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Last updated: April 2026
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <article className="space-y-12">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-zinc-700/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-zinc-100">{section.title}</h2>
                      {Array.isArray(section.content) ? (
                        <ul className="mt-4 space-y-3">
                          {section.content.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm leading-7 text-zinc-400">
                              {i > 0 && (
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/40" />
                              )}
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm leading-7 text-zinc-400">{section.content}</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </article>

          {/* Bottom CTA */}
          <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Questions about our cookie usage? Contact us at{" "}
              <a
                href="mailto:privacy@shadowspark.tech"
                className="text-emerald-400 underline underline-offset-4 transition-colors hover:text-emerald-300"
              >
                privacy@shadowspark.tech
              </a>
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md transition-colors hover:bg-emerald-500/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
