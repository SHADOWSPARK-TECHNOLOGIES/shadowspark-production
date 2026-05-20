import Link from "next/link";
import { ArrowLeft, Shield, Database, Share2, Lock, UserCheck, Clock, Mail } from "lucide-react";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    icon: Database,
    content: [
      "ShadowSpark collects the following categories of information to provide and improve our sovereign compliance platform:",
      "Biometric Data — Facial recognition data collected via rPPG (remote photoplethysmography) for liveness detection and anti-spoofing verification. This data is used exclusively for identity verification and is stored with AES-256 encryption.",
      "Business Data — Company registration details, director information, beneficial ownership structures, financial records, and compliance documentation required for regulatory reporting to SEC, CBN, and FIRS.",
      "Usage Data — Platform interaction data, including login timestamps, feature usage patterns, API call logs, and performance metrics. This data helps us optimize the platform and improve user experience.",
      "Communication Data — Records of communications via WhatsApp, email, and in-platform messaging for compliance auditing and support purposes.",
    ],
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    icon: Shield,
    content: [
      "We use the collected information for the following purposes:",
      "To provide, maintain, and improve the Platform's compliance verification and monitoring services.",
      "To perform biometric liveness detection and identity verification for secure onboarding and authentication.",
      "To generate regulatory compliance reports and filings as required by Nigerian financial regulators.",
      "To communicate with you regarding your account, service updates, security alerts, and support requests.",
      "To detect, prevent, and address fraud, security incidents, and unauthorized access to the Platform.",
      "To comply with legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    id: "data-sharing",
    title: "3. Data Sharing and Disclosure",
    icon: Share2,
    content: [
      "ShadowSpark does not sell your personal data. We may share your information only in the following circumstances:",
      "With regulatory authorities (SEC, CBN, FIRS) as required for compliance reporting and audit purposes.",
      "With trusted service providers who process data on our behalf under strict data processing agreements (e.g., cloud infrastructure, payment processing).",
      "When required by law, court order, or legal process, or to protect the rights, property, or safety of ShadowSpark, our users, or others.",
      "In connection with a merger, acquisition, or sale of assets, with notice to users before any data transfer occurs.",
    ],
  },
  {
    id: "data-security",
    title: "4. Data Security",
    icon: Lock,
    content: [
      "We implement enterprise-grade security measures to protect your data:",
      "Encryption at Rest — All data stored using AES-256 encryption, ensuring your information remains secure even in the event of unauthorized database access.",
      "Encryption in Transit — All data transmitted between your systems and our Platform is protected using TLS 1.3 protocol, the latest industry standard for secure communications.",
      "Infrastructure Security — The Platform runs on Google Cloud Run within isolated VPCs, protected by Web Application Firewall (WAF) and intrusion detection systems.",
      "Access Controls — Strict role-based access control (RBAC) with multi-factor authentication (MFA) and comprehensive audit logging for all data access events.",
    ],
  },
  {
    id: "your-rights",
    title: "5. Your Rights",
    icon: UserCheck,
    content: [
      "Under the Nigeria Data Protection Regulation (NDPR) and other applicable privacy laws, you have the following rights:",
      "Right of Access — You may request a copy of the personal data we hold about you.",
      "Right to Correction — You may request correction of inaccurate or incomplete personal data.",
      "Right to Deletion — You may request deletion of your personal data, subject to legal retention requirements.",
      "Right to Restriction — You may request restriction of processing your personal data under certain circumstances.",
      "Right to Data Portability — You may request a machine-readable copy of your data for transfer to another service provider.",
      "Right to Object — You may object to the processing of your personal data for specific purposes.",
    ],
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    icon: Clock,
    content:
      "We retain your personal data only for as long as necessary to fulfill the purposes described in this Privacy Policy, or as required by applicable law. Biometric data is retained for the duration of your active account and securely deleted within 90 days of account closure, unless retention is required for regulatory compliance or legal proceedings. Business records and compliance documentation are retained in accordance with SEC, CBN, and FIRS record-keeping requirements.",
  },
  {
    id: "contact",
    title: "7. Contact",
    icon: Mail,
    content:
      "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at privacy@shadowspark.tech or via our WhatsApp Business line. We aim to respond to all privacy inquiries within 5 business days.",
  },
];

export default function PrivacyPage() {
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
            PRIVACY
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            How ShadowSpark collects, uses, and protects your data
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
              For privacy-related inquiries, contact our Data Protection Officer at{" "}
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
