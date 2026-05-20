'use client';

export default function MarketingError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-6 text-center">
      <span className="mb-6 text-5xl">⚠️</span>
      <h1 className="font-display mb-4 text-3xl font-semibold tracking-tight text-white">
        Connection Interrupted
      </h1>
      <p className="mb-8 max-w-md font-sans text-sm leading-relaxed text-zinc-400">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-8 py-4 text-sm font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md transition-all duration-300 hover:bg-emerald-500/20 hover:shadow-[0_0_40px_rgba(16,149,106,0.15)]"
      >
        <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,149,106,0.08),transparent)] translate-x-[-100%] transition-all duration-700 group-hover:translate-x-[100%]" />
        Retry Connection
      </button>
    </div>
  );
}
