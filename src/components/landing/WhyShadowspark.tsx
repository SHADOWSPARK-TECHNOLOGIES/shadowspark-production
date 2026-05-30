const points = [
  {
    title: "Built for Nigeria, not for conference talks",
    body: "We know WhatsApp matters more than email here. We know NIN and BVN flows. We know payment friction. We know what works on a 3G connection in Owerri at peak hour. Our products work for the way Nigerians actually use the internet.",
  },
  {
    title: "We ship real systems, not prototypes",
    body: "Lodgist is live. The verification flow works on real users with real documents. We don't pitch \"what AI could do\" — we show you what we've already built. Then we build yours the same way.",
  },
  {
    title: "You talk to the builder",
    body: "No account managers. No layers. When something is risky, we tell you. When you don't need a feature, we tell you. When the price should be lower because the scope is smaller, we lower it. Honest is faster.",
  },
];

export function WhyShadowspark() {
  return (
    <section className="bg-[#0B1B2B] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C]">
            Why ShadowSpark
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-[1.15]">
            Three things that actually matter.
          </h2>
        </div>

        <div className="flex flex-col gap-10 lg:gap-12">
          {points.map((point, i) => (
            <div key={point.title} className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-12 items-start">
              <span className="text-5xl font-black text-[#1ABC9C]/20 leading-none select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{point.title}</h3>
                <p className="text-base text-[#94A3B8] leading-relaxed">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
