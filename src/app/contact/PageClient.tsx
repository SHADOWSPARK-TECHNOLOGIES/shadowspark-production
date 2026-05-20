"use client";

import { useState } from "react";

type ContactFormData = {
  name: string;
  email: string;
  company: string;
  monthlyLeadVolume: string;
  message: string;
};

const initialFormData: ContactFormData = {
  name: "",
  email: "",
  company: "",
  monthlyLeadVolume: "",
  message: "",
};

export default function ContactClient() {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) {
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
        headers: { "Content-Type": "application/json" },
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
    <main className="min-h-screen bg-[#050505] px-6 py-14 text-zinc-100 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-8 shadow-[0_0_70px_rgba(16,149,106,0.06)] backdrop-blur-md">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-emerald-400">
            Enterprise Contact
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Book an Enterprise Infrastructure Call
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            For high-volume teams and specialized operations. We{"'"}ll design a system tailored to your scale.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "System Design", value: "Tailored to volume and workflow" },
              { label: "Response Time", value: "Within 4 business hours" },
              { label: "Engagement", value: "Consultative, not generic" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-md"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* What happens next section */}
          <div className="mt-10 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-400">
              What happens next
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                "We review your request and assess operational fit within 4 business hours.",
                "A senior infrastructure architect reaches out to schedule a 30-minute discovery call.",
                "You receive a tailored system proposal with scope, timeline, and pricing.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-7 text-zinc-300">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-8 shadow-[0_0_50px_rgba(16,149,106,0.06)]"
          aria-label="Contact form"
        >
          {/* Success state */}
          {success ? (
            <div
              className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-6"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-mono uppercase tracking-[0.22em] text-emerald-400">
                Request Received
              </p>
              <h2 className="mt-4 text-2xl font-black text-white">Consultation requested</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-200">
                We respond within 4 business hours with next steps for your infrastructure call.
              </p>
            </div>
          ) : null}

          {/* Error state */}
          {error ? (
            <div
              className="mb-6 rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-4"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-zinc-200">
                Name <span className="text-emerald-400" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                value={formData.name}
                onChange={(event) => setField("name", event.target.value)}
                required
                aria-required="true"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-zinc-200">
                Email <span className="text-emerald-400" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={formData.email}
                onChange={(event) => setField("email", event.target.value)}
                required
                aria-required="true"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="contact-company" className="mb-2 block text-sm font-medium text-zinc-200">
                Company <span className="text-emerald-400" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-company"
                type="text"
                value={formData.company}
                onChange={(event) => setField("company", event.target.value)}
                required
                aria-required="true"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="contact-volume" className="mb-2 block text-sm font-medium text-zinc-200">
                Monthly Lead Volume
              </label>
              <select
                id="contact-volume"
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
              <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-zinc-200">
                Message
              </label>
              <textarea
                id="contact-message"
                value={formData.message}
                onChange={(event) => setField("message", event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                placeholder="Describe your current sales flow, volume, and where you need infrastructure support."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-6 py-4 text-base font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Request Consultation"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
