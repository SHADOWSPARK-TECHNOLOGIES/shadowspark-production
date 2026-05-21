"use client";

import { useMemo, useState } from "react";

const featureOptions = ["Website", "Chatbot", "Payments", "CRM", "Custom"];
const chatbotEmbedUrl = process.env.NEXT_PUBLIC_CHATBOT_URL;

type ChatLeadData = {
  businessType: string;
  goals: string;
  features: string[];
  name: string;
  email: string;
};

const initialData: ChatLeadData = {
  businessType: "",
  goals: "",
  features: [],
  name: "",
  email: "",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<ChatLeadData>(initialData);

  const hasEmbed = useMemo(() => Boolean(chatbotEmbedUrl), []);

  function setField<K extends keyof ChatLeadData>(key: K, value: ChatLeadData[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function toggleFeature(feature: string) {
    setFormData((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.businessType || !formData.goals.trim() || !formData.email.trim()) {
      setError("Business type, goals, and email are required.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/qualify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessType: formData.businessType,
          businessGoals: formData.goals,
          featuresNeeded: formData.features,
          name: formData.name,
          email: formData.email,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Unable to start qualification.");
      }

      setSuccess("Qualification started. A tailored demo flow is being prepared.");
      setFormData(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start qualification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#00E5FF] text-[#050505] shadow-[0_0_30px_rgba(0,229,255,0.45)] transition hover:scale-105 hover:brightness-110 animate-pulse"
        aria-label="Open chat"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 10h8M8 14h5" />
          <path d="M17 20l-3.5-2H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4Z" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          />

          <aside className="absolute bottom-0 right-0 h-[88vh] w-full max-w-md rounded-t-[2rem] border border-zinc-800 bg-[#050505] p-5 text-zinc-100 shadow-[0_0_50px_rgba(0,229,255,0.15)] sm:bottom-6 sm:right-6 sm:h-[78vh] sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  ShadowSpark Chat
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">Start a tailored qualification</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Close
              </button>
            </div>

            {hasEmbed ? (
              <div className="mt-4 h-[calc(100%-5rem)] overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950">
                <iframe
                  src={chatbotEmbedUrl}
                  title="ShadowSpark chatbot"
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="mt-4 h-[calc(100%-5rem)] overflow-y-auto pr-1">
                <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-zinc-200">
                  No embed URL is configured yet, so this panel uses the same qualification backend as the main form.
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">Business Type</label>
                    <select
                      value={formData.businessType}
                      onChange={(event) => setField("businessType", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                    >
                      <option value="">Select your industry</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Salon">Salon</option>
                      <option value="Agency">Agency</option>
                      <option value="Clinic">Clinic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">Goals</label>
                    <textarea
                      value={formData.goals}
                      onChange={(event) => setField("goals", event.target.value)}
                      rows={4}
                      placeholder="Get more leads, automate follow-ups, improve conversion..."
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">Features Needed</label>
                    <div className="grid grid-cols-2 gap-2">
                      {featureOptions.map((feature) => {
                        const active = formData.features.includes(feature);
                        return (
                          <button
                            key={feature}
                            type="button"
                            onClick={() => toggleFeature(feature)}
                            className={[
                              "rounded-xl border px-3 py-3 text-sm transition",
                              active
                                ? "border-cyan-400 bg-cyan-400/10 text-white"
                                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-400/40",
                            ].join(" ")}
                          >
                            {feature}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => setField("name", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => setField("email", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                    />
                  </div>

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                  {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#00E5FF] px-6 py-3 text-sm font-bold text-[#050505] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Starting..." : "Start Qualification"}
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
