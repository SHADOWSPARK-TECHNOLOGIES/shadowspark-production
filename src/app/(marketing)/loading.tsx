export default function MarketingLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian">
      {/* Spinner */}
      <div className="relative mb-8 h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
      </div>
      <p className="font-mono text-[11px] tracking-[0.22em] text-zinc-600">
        INITIALIZING SOVEREIGN NODE
      </p>
      <div className="mt-6 flex gap-1.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
