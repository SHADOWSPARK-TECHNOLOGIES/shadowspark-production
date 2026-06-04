import Link from "next/link";

export function LiveDeployment() {
  return (
    <section id="live-deployment" className="bg-[#0B1B2B] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:gap-16 lg:grid-cols-2">

          {/* LEFT column */}
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C]">
              LIVE DEPLOYMENT
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-[1.15]">
              The system, already running. <em>Lodgist</em>
            </h2>
            <p className="mt-4 text-base text-[#94A3B8] leading-relaxed">
              Lodgist — ShadowSpark's AI-powered rental discovery platform —
              is a live deployment of the same system we build for clients.
              It captures, qualifies, and routes property enquiries automatically
              across WhatsApp and web. No manual follow-up. No missed leads.
              Built on the same four-layer stack.
            </p>
          </div>

          {/* RIGHT column — deployment card */}
          <div className="rounded-2xl bg-[#142a40] border border-white/10 p-6 sm:p-8 flex flex-col gap-5">
            {/* Monospace pill */}
            <span className="self-start rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-mono tracking-widest text-[#94A3B8] uppercase">
              DEPLOYMENT: LODGIST
            </span>

            {/* Stack row */}
            <p className="font-mono text-xs text-[#94A3B8]">
              Next.js · Prisma · Neon · AI Agents · WhatsApp
            </p>

            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1ABC9C] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1ABC9C]" />
              </span>
              <span className="text-sm font-bold text-[#1ABC9C]">LIVE</span>
            </div>

            {/* Stat line */}
            <p className="text-sm text-[#94A3B8]">Automated response: &lt; 2 minutes</p>

            {/* CTA */}
            <Link
              href="https://lodgist.com.ng" /* TODO: confirm real Lodgist URL */
              target="_blank"
              rel="noopener noreferrer"
              className="self-start inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white hover:border-white/60 hover:bg-white/5 transition-colors"
            >
              See Lodgist →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
