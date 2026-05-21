const COMPANIES = [
  "Lagos Prime Properties",
  "Polaris Vault MFB",
  "KryptoBay Exchange",
  "AfriTrade Logistics",
  "Greenfield Agric",
] as const;

export function TrustedByStrip() {
  return (
    <section className="border-y border-zinc-800/50 py-8 my-12 px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-8 text-center text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
          Trusted by growing companies across Nigeria
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {COMPANIES.map((company) => (
            <span
              key={company}
              className="text-zinc-600 text-sm font-medium tracking-wide uppercase"
            >
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
