"use client";

import type { LucideIcon } from "lucide-react";

type CarouselItem = {
  id: string;
  title: string;
  category: string;
  summary: string;
  outcome: string;
  accent: string;
  icon: LucideIcon;
};

type AppleCardsCarouselProps = {
  items: CarouselItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function AppleCardsCarousel({
  items,
  activeId,
  onSelect,
}: AppleCardsCarouselProps) {
  return (
    <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-full gap-4">
        {items.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={[
                "group relative min-w-[280px] flex-1 overflow-hidden rounded-[2rem] border p-5 text-left transition duration-300",
                "bg-[linear-gradient(180deg,rgba(10,14,24,0.92),rgba(5,8,15,0.92))] shadow-[0_24px_80px_rgba(2,6,23,0.35)]",
                isActive
                  ? "border-cyan-300/40 ring-1 ring-cyan-300/20"
                  : "border-white/10 hover:border-white/20",
              ].join(" ")}
            >
              <div
                className="absolute inset-x-6 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`,
                }}
              />
              <div
                className="absolute -right-10 top-8 h-28 w-28 rounded-full blur-3xl transition-opacity duration-300"
                style={{
                  backgroundColor: item.accent,
                  opacity: isActive ? 0.26 : 0.12,
                }}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: isActive ? `${item.accent}66` : "rgba(255,255,255,0.08)",
                      background: isActive ? `${item.accent}22` : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    {item.category}
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                      System Layer
                    </p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-sm leading-7 text-slate-300">{item.summary}</p>

                  <div className="rounded-[1.4rem] border border-white/8 bg-white/3 px-4 py-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
                      Business Outcome
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/90">{item.outcome}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
