"use client";

import { useState } from "react";

type FormData = {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  message: string;
};

const empty: FormData = { name: "", company: "", email: "", whatsapp: "", message: "" };

export function Contact() {
  const [form, setForm] = useState<FormData>(empty);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  function set<K extends keyof FormData>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
      setForm(empty);
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-[#94A3B8] outline-none transition focus:border-[#1ABC9C] focus:ring-1 focus:ring-[#1ABC9C]/50";

  return (
    <section className="bg-[#0B1B2B] py-12 sm:py-16" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C]">
            Let&apos;s Talk
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-[1.15]">
            Tell us what you&apos;re trying to build.
          </h2>
          <p className="mt-3 text-base text-[#94A3B8]">
            We&apos;ll come back with a plan within 48 hours.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Form */}
          <div>
            {status === "success" ? (
              <div className="rounded-2xl border border-[#1ABC9C]/30 bg-[#1ABC9C]/10 p-8" role="status">
                <p className="text-lg font-bold text-white">Got it.</p>
                <p className="mt-2 text-[#94A3B8]">We&apos;ll come back to you within 48 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                {status === "error" && (
                  <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300" role="alert">
                    Couldn&apos;t send right now. Please reach us directly at{" "}
                    {/* TODO: needs real value from operator */}
                    <a href="mailto:hello@shadowspark.ng" className="underline">hello@shadowspark.ng</a>
                  </p>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium text-white">
                      Your name <span className="text-[#FF6F3C]">*</span>
                    </label>
                    <input id="c-name" type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="c-company" className="mb-1.5 block text-sm font-medium text-white">
                      Company or organisation
                    </label>
                    <input id="c-company" type="text" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium text-white">
                      Email <span className="text-[#FF6F3C]">*</span>
                    </label>
                    <input id="c-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="c-wa" className="mb-1.5 block text-sm font-medium text-white">
                      WhatsApp number
                    </label>
                    <input id="c-wa" type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inputClass} placeholder="+234 XXX XXX XXXX" />
                  </div>
                </div>

                <div>
                  <label htmlFor="c-msg" className="mb-1.5 block text-sm font-medium text-white">
                    What are you trying to build? <span className="text-[#FF6F3C]">*</span>
                  </label>
                  <textarea
                    id="c-msg"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6F3C] px-8 py-4 text-sm font-bold text-white hover:bg-[#e85e2c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {status === "sending" ? "Sending…" : "Send"}
                  {status !== "sending" && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Direct contact */}
          <div className="flex flex-col gap-6 text-sm text-[#94A3B8]">
            <p className="font-semibold text-white">Or reach us directly:</p>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#1ABC9C] mb-1">Email</p>
                {/* TODO: needs real value from operator */}
                <a href="mailto:hello@shadowspark.ng" className="text-white hover:text-[#1ABC9C] transition-colors">
                  hello@shadowspark.ng
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#1ABC9C] mb-1">WhatsApp</p>
                {/* TODO: needs real value from operator */}
                <a
                  href="https://wa.me/234XXXXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#1ABC9C] transition-colors inline-flex items-center gap-1"
                >
                  Chat on WhatsApp
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#1ABC9C] mb-1">Based in</p>
                {/* TODO: needs real value from operator — confirm any other cities */}
                <p className="text-white">Port Harcourt · Owerri</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
