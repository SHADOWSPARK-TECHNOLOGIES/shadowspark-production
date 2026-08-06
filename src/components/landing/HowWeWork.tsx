const steps = [
  {
    num: "01",
    title: "Discovery Call (Free)",
    body: "30 minutes. We hear your problem, your audience, your constraints. No pitch deck. No hard sell. If we're not the right team, we'll tell you and recommend who is.",
  },
  {
    num: "02",
    title: "Scoped Proposal",
    body: "Within 48 hours of the call, we send you a written plan: what we'll build, in what order, by when, for how much. Fixed price. No \"agile pricing\" surprises.",
  },
  {
    num: "03",
    title: "Weekly Shipping",
    body: "Every Friday you see real progress on a real URL — not slides describing future progress. We ship working software from week one, then refine.",
  },
  {
    num: "04",
    title: "Launch & Hand-off",
    body: "We go live with you, train your team, document everything, and stay on for post-launch support. You own the code. We're a partner, not a vendor lock-in.",
  },
];

export function HowWeWork() {
  return (
    <section className="bg-[#F8F5F0] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#FF6F3C]">
            How We Work
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0B1B2B] leading-[1.15]">
            Four stages. No surprises.
          </h2>
          <p className="mt-3 text-base text-[#6B7280]">
            Clear scope, fixed price, weekly progress on a real URL.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.num} className="flex flex-col gap-4">
              <span className="text-4xl font-black text-[#FF6F3C] leading-none">{step.num}</span>
              <h3 className="text-xl font-bold text-[#0B1B2B]">{step.title}</h3>
              <p className="text-base text-[#6B7280] leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
