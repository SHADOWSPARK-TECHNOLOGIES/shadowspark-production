"use client";

import { trackMetaEvent } from "@/components/meta-events";

const plans = [
  { name: "Starter", value: 75000 },
  { name: "Growth", value: 250000 },
  { name: "Enterprise", value: 900000 },
];

export default function Pricing() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="text-center text-3xl font-semibold text-white">Pricing</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <button
            key={plan.name}
            type="button"
            onClick={() =>
              trackMetaEvent("InitiateCheckout", {
                currency: "NGN",
                value: plan.value,
                plan: plan.name,
              })
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left hover:border-emerald-500/50"
          >
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-zinc-400">NGN {plan.value.toLocaleString()}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
