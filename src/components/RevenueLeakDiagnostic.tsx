"use client";

const diagnosticCards = [
  {
    problem: "Slow Response",
    solution: "AI-guided replies engage leads immediately and route qualified demand without waiting on manual follow-up.",
  },
  {
    problem: "Weak Follow-up",
    solution: "Structured WhatsApp sequences keep warm prospects moving until they book, buy, or escalate.",
  },
  {
    problem: "Missed Leads",
    solution: "Website capture, chatbot intake, and operator visibility reduce drop-off across the full journey.",
  },
  {
    problem: "No Visibility",
    solution: "A single dashboard shows source quality, handoff state, and revenue-critical pipeline movement.",
  },
];

export default function RevenueLeakDiagnostic() {
  return (
    <section className="w-full bg-[#050505] px-6 py-20 text-zinc-100 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-cyan-300">
            Revenue Leak Diagnostic
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Where Revenue Leaks — And How We Fix It
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {diagnosticCards.map((card) => (
            <div key={card.problem} className="group [perspective:1200px]">
              <div className="relative min-h-[260px] rounded-[1.75rem] transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] max-md:group-hover:[transform:none]">
                <div className="absolute inset-0 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(0,229,255,0.05)] backdrop-blur-md [backface-visibility:hidden]">
                  <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-cyan-300">
                    Problem
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-white">{card.problem}</h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    Hover to inspect the system-level correction.
                  </p>
                </div>

                <div className="absolute inset-0 rounded-[1.75rem] border border-cyan-400/30 bg-cyan-400/10 p-6 shadow-[0_0_30px_rgba(0,229,255,0.1)] backdrop-blur-md [backface-visibility:hidden] [transform:rotateY(180deg)] max-md:[transform:none] max-md:opacity-0 max-md:group-active:opacity-100">
                  <div className="inline-flex rounded-full border border-cyan-300/30 bg-[#03131a] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-cyan-200">
                    ShadowSpark Fix
                  </div>
                  <p className="mt-6 text-base leading-7 text-zinc-100">{card.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
