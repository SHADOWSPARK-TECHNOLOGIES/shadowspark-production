const tags = [
  "Next.js", "TypeScript", "Prisma", "PostgreSQL",
  "Tailwind", "Vercel", "WhatsApp Business API",
  "Korapay", "Resend", "Claude", "Gemini", "OpenAI",
];

export function Stack() {
  return (
    <section className="bg-[#142a40] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#1ABC9C]">
          The Stack
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white leading-[1.15]">
          Tools we trust because we&apos;ve shipped with them.
        </h2>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-[#94A3B8]"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-8 text-sm text-[#94A3B8]">
          Plus whatever else the job needs. We pick tools that fit the problem — not the other way around.
        </p>
      </div>
    </section>
  );
}
