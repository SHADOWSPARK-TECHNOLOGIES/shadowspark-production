"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiniAudit from "./MiniAudit";

type FormData = {
  businessType: string;
  businessGoals: string;
  featuresNeeded: string[];
  name: string;
  email: string;
  phone: string;
  companyName: string;
};

const businessTypes = [
  "Logistics",
  "Real Estate",
  "Restaurant",
  "Salon",
  "Agency",
  "Clinic",
  "Other",
];

const featureOptions = ["Website", "Chatbot", "Payments", "CRM", "Custom"];

const initialFormData: FormData = {
  businessType: "",
  businessGoals: "",
  featuresNeeded: [],
  name: "",
  email: "",
  phone: "",
  companyName: "",
};

const stepLabels = ["Business Type", "Goals", "Features", "Contact"];

function getRecommendedPackage(formData: FormData): "launch" | "growth" | "automation" {
  const normalizedGoals = formData.businessGoals.toLowerCase();
  const selectedFeatures = formData.featuresNeeded;
  const automationSignals =
    selectedFeatures.includes("Chatbot") ||
    selectedFeatures.includes("CRM") ||
    selectedFeatures.includes("Payments");

  if (
    selectedFeatures.length >= 3 ||
    normalizedGoals.includes("automate") ||
    normalizedGoals.includes("follow-up") ||
    automationSignals
  ) {
    return "automation";
  }

  if (
    selectedFeatures.includes("Website") && selectedFeatures.length >= 2 ||
    normalizedGoals.includes("lead") ||
    normalizedGoals.includes("sales")
  ) {
    return "growth";
  }

  return "launch";
}

export default function QualificationForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const progress = useMemo(() => (step / 4) * 100, [step]);
  const recommendedPackage = useMemo(() => getRecommendedPackage(formData), [formData]);
  const auditBusinessType = formData.businessType || "Nigerian";
  const auditGoals = formData.businessGoals || "capture more leads and improve follow-up";
  const auditFeatures =
    formData.featuresNeeded.length > 0 ? formData.featuresNeeded : ["Website", "Chatbot"];

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function toggleFeature(feature: string) {
    const nextFeatures = formData.featuresNeeded.includes(feature)
      ? formData.featuresNeeded.filter((item) => item !== feature)
      : [...formData.featuresNeeded, feature];

    setField("featuresNeeded", nextFeatures);
  }

  function validateCurrentStep() {
    const nextErrors: Record<string, string> = {};

    if (step === 1 && !formData.businessType) {
      nextErrors.businessType = "Select a business type.";
    }

    if (step === 2 && formData.businessGoals.trim().length < 10) {
      nextErrors.businessGoals = "Enter at least 10 characters describing your goals.";
    }

    if (step === 3 && formData.featuresNeeded.length === 0) {
      nextErrors.featuresNeeded = "Select at least one feature.";
    }

    if (step === 4) {
      if (!formData.name.trim()) nextErrors.name = "Name is required.";
      if (!formData.companyName.trim()) nextErrors.companyName = "Company name is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!/^[0-9+\-\s()]{7,}$/.test(formData.phone.trim())) {
        nextErrors.phone = "Enter a valid phone number.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleNext() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function handleBack() {
    setSubmitError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/qualify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.leadId) {
        throw new Error(result?.error || "Qualification failed.");
      }

      router.push(`/checkout/new?leadId=${encodeURIComponent(result.leadId)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Qualification failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6 text-zinc-100 shadow-[0_0_50px_rgba(0,229,255,0.08)] sm:p-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
            <span>Qualification Form</span>
            <span>Step {step} of 4</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-[#00E5FF] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const active = stepNumber === step;
              const completed = stepNumber < step;

              return (
                <div
                  key={label}
                  className={[
                    "rounded-2xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300",
                    active
                      ? "border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.16)]"
                      : completed
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500",
                  ].join(" ")}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            key={step}
            className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-6"
          >
            {step === 1 ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-200">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={(event) => setField("businessType", event.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                >
                  <option value="">Select your industry</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.businessType ? (
                  <p className="text-sm text-red-400">{errors.businessType}</p>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-200">Business Goals</label>
                <textarea
                  value={formData.businessGoals}
                  onChange={(event) => setField("businessGoals", event.target.value)}
                  rows={5}
                  placeholder='e.g. "Get more leads", "Automate follow-ups"'
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                />
                {errors.businessGoals ? (
                  <p className="text-sm text-red-400">{errors.businessGoals}</p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-200">Features Needed</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {featureOptions.map((feature) => {
                    const active = formData.featuresNeeded.includes(feature);
                    return (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => toggleFeature(feature)}
                        className={[
                          "rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-[#00E5FF] bg-cyan-400/10 text-white"
                            : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-400/50",
                        ].join(" ")}
                      >
                        {feature}
                      </button>
                    );
                  })}
                </div>
                {errors.featuresNeeded ? (
                  <p className="text-sm text-red-400">{errors.featuresNeeded}</p>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setField("name", event.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                  />
                  {errors.name ? <p className="mt-1 text-sm text-red-400">{errors.name}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setField("email", event.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                  />
                  {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                  />
                  {errors.phone ? <p className="mt-1 text-sm text-red-400">{errors.phone}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(event) => setField("companyName", event.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]"
                  />
                  {errors.companyName ? (
                    <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-red-400">{submitError}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || submitting}
              className="inline-flex rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex rounded-full bg-[#00E5FF] px-6 py-3 text-sm font-bold text-black transition hover:brightness-110"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex rounded-full bg-[#00E5FF] px-6 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Continue to Checkout"}
              </button>
            )}
          </div>
        </form>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-100">
          Your $1 demo deposit will be tailored to the business type, features, and workflow you select here.
        </div>
        <MiniAudit
          businessType={auditBusinessType}
          goals={auditGoals}
          features={auditFeatures}
          recommendedPackage={recommendedPackage}
          showCta={false}
        />
      </aside>
    </div>
  );
}
