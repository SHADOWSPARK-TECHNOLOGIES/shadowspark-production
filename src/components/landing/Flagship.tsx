import Link from "next/link";

const solutions = [
  "Landlord identity verified via NIN / BVN",
  "Bank account confirmed to match verified owner",
  "AI search agent — natural language, real results",
  "Direct verified contact — no agent fees, no markup",
  "Branded receipts as legal-grade dispute evidence",
];

export function Flagship() {
  return (
    <section id="flagship" className="bg-[#0B1B2B] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C]">
            Our Flagship Product
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-[1.15]">
            Lodgist — built by ShadowSpark.
          </h2>
          <p className="mt-3 text-base text-[#94A3B8] max-w-2xl">
            Nigeria&apos;s first identity-verified student housing platform.
            Live. Working. Already changing how students rent.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Problem */}
          <div className="rounded-2xl bg-[#142a40] p-6 sm:p-8 border border-white/10">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#94A3B8] mb-4">
              The Problem
            </p>
            <div className="w-8 h-px bg-[#94A3B8] mb-6" aria-hidden="true" />
            <p className="text-base text-[#94A3B8] leading-relaxed">
              Every September, Nigerian students lose hundreds of millions to fake
              agents, ghost landlords, and bait-and-switch property scams.
            </p>
            <p className="mt-4 text-base text-[#94A3B8] leading-relaxed">
              Fraud is so common it&apos;s considered normal. No platform actually
              stops it.
            </p>
            <p className="mt-4 text-base text-[#94A3B8] leading-relaxed">
              The reason: nobody verifies the person collecting the money.
            </p>
          </div>

          {/* Solution */}
          <div className="rounded-2xl bg-[#142a40] p-6 sm:p-8 border border-[#1ABC9C]/20">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C] mb-4">
              The Solution
            </p>
            <div className="w-8 h-px bg-[#1ABC9C] mb-6" aria-hidden="true" />
            <ul className="space-y-3">
              {solutions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-white">
                  <svg
                    className="mt-0.5 shrink-0 text-[#1ABC9C]"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M3 9l4.5 4.5L15 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-[#94A3B8] leading-relaxed">
              Result: students pay verified landlords directly, agent fees disappear, fraud collapses.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3">
          <Link
            href="https://lodgist.com.ng" /* TODO: needs real value from operator — confirm live URL */
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6F3C] px-8 py-4 text-sm font-bold text-white hover:bg-[#e85e2c] transition-colors"
          >
            See Lodgist Live
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="text-sm text-[#94A3B8]">
            Built by ShadowSpark Technologies. Currently launching across Imo State
            institutions — FUTO, IMSU, Federal Polytechnic Nekede, Alvan Ikoku, Imo State Polytechnic.
          </p>
        </div>
      </div>
    </section>
  );
}
