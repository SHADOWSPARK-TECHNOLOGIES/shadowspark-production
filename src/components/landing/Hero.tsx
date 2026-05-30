import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#0B1B2B] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C] mb-6">
          Nigerian AI Agency
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] max-w-3xl">
          AI Built for Nigeria.
          <br />
          Shipped, Not Pitched.
        </h1>

        <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#94A3B8] max-w-2xl">
          We design and build AI-powered products that solve real problems for
          Nigerian businesses — from property fraud to operations automation.
          Our flagship product, Lodgist, is live and protecting Nigerian
          students today.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="#flagship"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6F3C] px-8 py-4 text-sm font-bold text-white hover:bg-[#e85e2c] transition-colors"
          >
            See What We&apos;ve Built
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-sm font-bold text-white hover:border-white/60 hover:bg-white/5 transition-colors"
          >
            Start a Project
          </Link>
        </div>

        <p className="mt-10 text-xs text-[#94A3B8] tracking-wide">
          Built in Nigeria&nbsp;&nbsp;·&nbsp;&nbsp;Production systems, not slides&nbsp;&nbsp;·&nbsp;&nbsp;You talk to the builder
        </p>
      </div>
    </section>
  );
}
