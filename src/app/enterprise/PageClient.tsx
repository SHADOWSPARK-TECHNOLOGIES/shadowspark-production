"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Building2, MessageSquareQuote, Waves } from "lucide-react";
import { GlassCard } from "@/components/ui/templates/GlassCard";
import { SovereignHero } from "@/components/ui/templates/SovereignHero";

type EnterpriseFormData = {
  name: string;
  email: string;
  company: string;
  monthlyLeadVolume: string;
  message: string;
};

const initialFormData: EnterpriseFormData = {
  name: "",
  email: "",
  company: "",
  monthlyLeadVolume: "",
  message: "",
};

export default function EnterpriseClient() {
  const [formData, setFormData] = useState<EnterpriseFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof EnterpriseFormData>(
    key: K,
    value: EnterpriseFormData[K]
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.name.trim() || !formData.company.trim()) {
      setError("Name and company are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setSuccess(true);
      setFormData(initialFormData);
    } catch {
      setError("Unable to submit your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-400 selection:bg-emerald-500/30">
      <SovereignHero
        headline={
          <>
            Deploy Enterprise <span className="text-emerald-500">Infrastructure</span>
          </>
        }
        subheadline="Custom systems for high-volume operations."
        ctaText="Request Consultation"
        ctaLink="#enterprise-form"
        secondaryCtaText="View Solutions"
        secondaryCtaLink="/solutions"
      />

      <section id="enterprise-form" className="border-t border-zinc-900 bg-zinc-950/40 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <GlassCard
              title="Built for operational complexity"
              description="Enterprise deployments are designed for teams handling serious volume, multiple handoff points, and specialized routing logic."
              icon={<Building2 className="h-6 w-6" />}
              highlighted
            >
              <div className="space-y-3">
                <p className="text-sm leading-7 text-zinc-300">
                  We scope channel strategy, qualification logic, operator visibility,
                  approvals, and integrations around your actual revenue workflow.
                </p>
              </div>
            </GlassCard>

            <GlassCard
              title="What this consultation covers"
              description="Use the request form to define current volume, channel pressure, and the handoff model your team needs."
              icon={<MessageSquareQuote className="h-6 w-6" />}
            >
              <div className="space-y-3 text-sm leading-7 text-zinc-300">
                <p>Lead intake architecture across web, WhatsApp, and workflow automation.</p>
                <p>Routing design for high-value enquiries and human escalation paths.</p>
                <p>Support model, operator visibility, and phased deployment planning.</p>
              </div>
            </GlassCard>

            <GlassCard
              title="Deployment profile"
              description="A fast way to tell us whether this is a growth system, an enterprise stack, or a multi-channel rebuild."
              icon={<Waves className="h-6 w-6" />}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Response Speed", value: "Instant-first" },
                  { label: "Routing Logic", value: "Custom" },
                  { label: "Support Model", value: "Managed" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
                      {item.label}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <GlassCard
              title="Request Consultation"
              description="Tell us how your operation works and where the current system loses momentum."
              highlighted
              className="h-full"
            >
              {/* Success state */}
              {success ? (
                <div
                  className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-xs font-mono uppercase tracking-[0.22em] text-emerald-400">
                    Request Received
                  </p>
                  <p className="mt-3 text-sm leading-7 text-zinc-200">
                    Your consultation request has been logged. We will follow up with next steps.
                  </p>
                </div>
              ) : null}

              {/* Error state */}
              {error ? (
                <div
                  className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="enterprise-name" className="mb-2 block text-sm font-medium text-zinc-200">
                    Name <span className="text-emerald-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="enterprise-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) => setField("name", event.target.value)}
                    required
                    aria-required="true"
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="enterprise-email" className="mb-2 block text-sm font-medium text-zinc-200">
                    Email <span className="text-emerald-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="enterprise-email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => setField("email", event.target.value)}
                    required
                    aria-required="true"
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="enterprise-company" className="mb-2 block text-sm font-medium text-zinc-200">
                    Company <span className="text-emerald-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="enterprise-company"
                    type="text"
                    value={formData.company}
                    onChange={(event) => setField("company", event.target.value)}
                    required
                    aria-required="true"
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="enterprise-volume" className="mb-2 block text-sm font-medium text-zinc-200">
                    Monthly Lead Volume
                  </label>
                  <select
                    id="enterprise-volume"
                    value={formData.monthlyLeadVolume}
                    onChange={(event) => setField("monthlyLeadVolume", event.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <option value="" disabled>Select volume range</option>
                    <option value="0-100">0 - 100</option>
                    <option value="101-500">101 - 500</option>
                    <option value="501-2000">501 - 2,000</option>
                    <option value="2000+">2,000+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="enterprise-message" className="mb-2 block text-sm font-medium text-zinc-200">
                    Message
                  </label>
                  <textarea
                    id="enterprise-message"
                    value={formData.message}
                    onChange={(event) => setField("message", event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Describe your current lead flow, team structure, channels, and where you need infrastructure support."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-4 text-base font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Request Consultation"}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
