import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonical("/terms"),
  title: "Terms of Service",
  description:
    "Terms of Service for ShadowSpark sovereign compliance platform — governing access, usage, and obligations for all users of the Platform.",
};

import Link from "next/link";
import { ArrowLeft, Shield, Scale, Gavel, Copyright, AlertTriangle, XCircle, MapPin, Mail } from "lucide-react";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    icon: Scale,
    content:
      "By accessing or using the ShadowSpark sovereign compliance platform (the 'Platform'), you agree to be bound by these Terms of Service ('Terms'). If you do not agree to all of these Terms, you may not access or use the Platform. These Terms apply to all users, including visitors, registered users, and enterprise clients.",
  },
  {
    id: "description",
    title: "2. Description of Service",
    icon: Shield,
    content: [
      "ShadowSpark provides an institutional-grade sovereign compliance infrastructure platform that includes the following core services:",
      "BVN Lock Compliance — Automated identity verification and compliance anchoring against the Central Bank of Nigeria's BVN-Phone Lock directive, ensuring all user identities are verified and anchored to verified phone numbers.",
      "rPPG Liveness Detection — Remote photoplethysmography (rPPG) based liveness detection for anti-spoofing and biometric identity verification, enabling secure remote onboarding and authentication.",
      "RWA Securitization — Tokenization and fractionalization of real-world assets (RWA) including real estate, luxury goods, and financial instruments into compliant, tradeable digital assets.",
      "Regulatory Monitoring — Real-time regulatory pulse monitoring across Nigerian financial regulators (SEC, CBN, FIRS) with automated compliance alerts and reporting.",
    ],
  },
  {
    id: "obligations",
    title: "3. User Obligations",
    icon: Gavel,
    content: [
      "As a user of the Platform, you agree to:",
      "Provide accurate, current, and complete information during registration and use of the Platform.",
      "Maintain the confidentiality of your account credentials and accept responsibility for all activities under your account.",
      "Use the Platform only for lawful purposes and in compliance with all applicable Nigerian laws and regulations.",
      "Not attempt to circumvent, disable, or interfere with security features, biometric verification systems, or anti-spoofing mechanisms.",
      "Not use the Platform to transmit any malicious code, viruses, or harmful data.",
      "Promptly notify ShadowSpark of any unauthorized use of your account or security breaches.",
    ],
  },
  {
    id: "intellectual-property",
    title: "4. Intellectual Property",
    icon: Copyright,
    content:
      "All intellectual property rights in the Platform, including but not limited to software, algorithms, biometric verification systems, compliance monitoring tools, user interface designs, trademarks, and proprietary technology, are owned by ShadowSpark Technologies or its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Platform solely for your intended business purposes. No ownership rights are transferred. You may not copy, modify, reverse engineer, or create derivative works of the Platform without express written consent.",
  },
  {
    id: "liability",
    title: "5. Limitation of Liability",
    icon: AlertTriangle,
    content:
      "To the maximum extent permitted by applicable law, ShadowSpark Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, arising from your use of or inability to use the Platform. Our total liability for any claims under these Terms shall not exceed the amount paid by you for access to the Platform in the twelve (12) months preceding the claim. This limitation applies regardless of the legal theory under which the claim is brought.",
  },
  {
    id: "termination",
    title: "6. Termination",
    icon: XCircle,
    content:
      "ShadowSpark reserves the right to suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform will immediately cease. Provisions of these Terms that by their nature should survive termination, including intellectual property provisions, limitation of liability, and governing law, shall survive.",
  },
  {
    id: "governing-law",
    title: "7. Governing Law",
    icon: MapPin,
    content:
      "These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Nigeria. The Platform operates in compliance with regulations set forth by the Securities and Exchange Commission (SEC), the Central Bank of Nigeria (CBN), and the Federal Inland Revenue Service (FIRS). Users are responsible for ensuring their use of the Platform complies with all applicable regulatory requirements.",
  },
  {
    id: "contact",
    title: "8. Contact Information",
    icon: Mail,
    content:
      "For questions about these Terms or to report a violation, please contact us at legal@shadowspark.tech or through our WhatsApp Business line. We respond to all legal inquiries within 5 business days.",
  },
];

export default function TermsPage() {
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
            LEGAL
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Governing the use of ShadowSpark Technologies' sovereign compliance platform
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
              Questions about these terms? Contact our legal team at{" "}
              <a
                href="mailto:legal@shadowspark.tech"
                className="text-emerald-400 underline underline-offset-4 transition-colors hover:text-emerald-300"
              >
                legal@shadowspark.tech
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
