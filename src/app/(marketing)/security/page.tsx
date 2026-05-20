import Link from "next/link";
import { ArrowLeft, Shield, Lock, Server, Scan, Activity, Key, Siren, Award } from "lucide-react";

const sections = [
  {
    id: "encryption",
    title: "Encryption Standards",
    icon: Lock,
    content:
      "ShadowSpark employs AES-256 encryption for all data at rest, ensuring your sensitive information — including biometric data, financial records, and compliance documentation — remains secure within our infrastructure. All data in transit is protected using TLS 1.3, the latest and most secure version of the TLS protocol, providing end-to-end encryption for every API call, dashboard session, and data synchronization event. Our encryption key management follows industry best practices with automated key rotation and Hardware Security Module (HSM) integration.",
  },
  {
    id: "infrastructure",
    title: "Infrastructure Security",
    icon: Server,
    content:
      "The Platform is deployed on Google Cloud Run within isolated Virtual Private Clouds (VPCs), ensuring network-level segmentation between customer environments. Our infrastructure is protected by a Web Application Firewall (WAF) that filters malicious traffic, DDoS protection systems, and intrusion detection/prevention systems (IDS/IPS). All infrastructure is configured with immutable infrastructure principles — no manual server access, no persistent SSH keys, and all changes deployed through CI/CD pipelines with mandatory code review. Regular vulnerability scanning and penetration testing are conducted by independent third-party security firms.",
  },
  {
    id: "biometric",
    title: "Biometric Security",
    icon: Scan,
    content:
      "Our rPPG (remote photoplethysmography) liveness detection technology analyzes subtle blood flow patterns from standard camera input to verify the presence of a live human being. This anti-spoofing mechanism detects and rejects presentation attacks including printed photos, video replays, deepfake injections, and 3D masks. Biometric data is processed entirely within our secure infrastructure and never stored in plaintext. The liveness detection pipeline operates with a sub-second response time while maintaining industry-leading accuracy rates exceeding 99.5% against presentation attacks.",
  },
  {
    id: "compliance-monitoring",
    title: "Compliance Monitoring",
    icon: Activity,
    content:
      "ShadowSpark's real-time regulatory pulse monitoring system continuously tracks changes across Nigerian financial regulators including SEC, CBN, and FIRS. Our system automatically correlates regulatory updates with your compliance posture, generating alerts when regulatory changes impact your obligations. All compliance events are immutably logged with cryptographic audit trails, providing verifiable evidence of regulatory monitoring and compliance status for audit purposes.",
  },
  {
    id: "access-control",
    title: "Access Control",
    icon: Key,
    content:
      "We implement granular Role-Based Access Control (RBAC) that allows organizations to define precise permissions for each user role. Multi-Factor Authentication (MFA) is enforced for all platform access, supporting TOTP, hardware security keys, and biometric authentication. Every access event — including login attempts, data views, configuration changes, and API calls — is recorded in our comprehensive audit logging system with immutable, tamper-evident storage. Session management includes automatic timeout, concurrent session limits, and IP-based access restrictions.",
  },
  {
    id: "incident-response",
    title: "Incident Response",
    icon: Siren,
    content:
      "ShadowSpark maintains a documented Incident Response Plan aligned with NIST SP 800-61 guidelines. Our Security Operations Center (SOC) provides 24/7 monitoring and threat detection. The incident response process includes automated alerting, defined escalation paths, containment procedures, forensic analysis, and post-incident review. We commit to notifying affected customers within 24 hours of confirmed security incidents that impact their data. Regular tabletop exercises and incident response drills ensure our team remains prepared for evolving threats.",
  },
  {
    id: "certifications",
    title: "Certifications and Standards",
    icon: Award,
    content:
      "ShadowSpark's security program is designed to align with international standards including ISO/IEC 27001 (Information Security Management), SOC 2 Type II (Service Organization Controls), and NDPR (Nigeria Data Protection Regulation) compliance. We undergo annual independent audits and penetration tests. Our infrastructure maintains compliance with PCI DSS Level 1 standards for payment data handling. We are committed to achieving ISO 27001 certification by Q3 2026.",
  },
];

export default function SecurityPage() {
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
            SECURITY
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Security
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Enterprise-grade security protecting your sovereign compliance infrastructure
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
                      <p className="mt-4 text-sm leading-7 text-zinc-400">{section.content}</p>
                    </div>
                  </div>
                </section>
              );
            })}
          </article>

          {/* Bottom CTA */}
          <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <Shield className="h-6 w-6 text-emerald-400" />
              <p className="text-sm text-zinc-400">
                For security concerns, contact our security team at{" "}
                <a
                  href="mailto:security@shadowspark.tech"
                  className="text-emerald-400 underline underline-offset-4 transition-colors hover:text-emerald-300"
                >
                  security@shadowspark.tech
                </a>
              </p>
            </div>
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
