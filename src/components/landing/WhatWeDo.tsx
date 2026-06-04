const cards = [
  {
    title: "AI Products & Platforms",
    body: "We design end-to-end AI products — chatbots that handle support in pidgin, search agents that understand budgets in naira, recommendation engines that learn from real user behaviour.",
    proof: "Built for Lodgist: a search agent that finds verified lodges from natural-language requests.",
  },
  {
    title: "Trust & Verification Infrastructure",
    body: "We build identity verification flows using NIN, BVN, bank account name resolution, and AI document screening — turning \"is this person real?\" into a yes-or-no answer in seconds.",
    proof: "Built for Lodgist: a four-step landlord verification flow that runs without a single human reviewer for clean cases.",
  },
  {
    title: "Operations & Automation",
    body: "WhatsApp automation, admin dashboards, payment integration, email + SMS pipelines, reporting tools — we wire the boring stuff so your team focuses on what only humans can do.",
    proof: "Built for Lodgist: an admin queue that processes verification requests with one-click decisions and a full audit trail.",
  },
];

export function WhatWeDo() {
  return (
    <section className="bg-[#F8F5F0] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#FF6F3C]">
            What We Build
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0B1B2B] leading-[1.15]">
            Three things we&apos;re good at.
          </h2>
          <p className="mt-3 text-base text-[#6B7280]">We don&apos;t do everything. We do these well.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E5E7EB] flex flex-col gap-4"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-[#0B1B2B]">{card.title}</h3>
              <p className="text-base text-[#6B7280] leading-relaxed flex-1">{card.body}</p>
              <p className="text-sm text-[#1ABC9C] font-medium border-t border-[#E5E7EB] pt-4">
                {card.proof}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
