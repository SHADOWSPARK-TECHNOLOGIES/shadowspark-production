"use client";

import { useState, useEffect, useCallback } from "react";
import { TESTIMONIALS } from "@/lib/marketing/testimonials";

const AUTOPLAY_INTERVAL = 6_000; // 6 seconds

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = TESTIMONIALS.length;

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
    },
    [],
  );

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;

    const id = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => clearInterval(id);
  }, [isPaused, goNext]);

  const t = TESTIMONIALS[current];

  return (
    <section className="my-16 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-1.5 text-[11px] font-mono tracking-[0.22em] text-emerald-400 backdrop-blur-md">
            SOCIAL PROOF
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Trusted by Industry Leaders
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-400">
            Nigerian financial institutions and fintechs rely on ShadowSpark for
            compliance, identity, and AI-powered lead conversion.
          </p>
        </div>

        {/* Carousel card */}
        <div
          className="mx-auto max-w-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 golden-transition">
            {/* Avatar + identity */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/50 text-sm font-bold tracking-wide text-emerald-400">
                {t.avatar}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{t.name}</p>
                <p className="text-sm text-zinc-400">
                  {t.role}, {t.company}
                </p>
              </div>
            </div>

            {/* Quote */}
            <blockquote className="text-lg leading-relaxed text-zinc-300 italic">
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            {/* Metric highlight */}
            <div className="mt-6 inline-block rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
              <span className="text-sm font-semibold text-emerald-400">
                {t.metric}
              </span>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="mt-8 flex items-center justify-center gap-2.5">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                className={`h-2.5 rounded-full golden-transition duration-300 ${
                  idx === current
                    ? "w-8 bg-emerald-400"
                    : "w-2.5 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-[11px] text-zinc-600">
          Results based on verified ShadowSpark clients. Individual results may vary.
        </p>
      </div>
    </section>
  );
}
