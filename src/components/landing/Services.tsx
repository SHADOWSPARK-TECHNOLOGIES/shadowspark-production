import Link from "next/link";

const columns = [
  {
    title: "AI Products",
    items: [
      "Customer support chatbots (web + WhatsApp)",
      "Document analysis & verification AI",
      "Natural-language search & recommendation",
      "Lead qualification agents",
      "Pidgin & Nigerian-English language support",
    ],
  },
  {
    title: "Trust Infrastructure",
    items: [
      "NIN / BVN identity verification",
      "Bank account name resolution",
      "Document upload + AI screening",
      "Fraud signal detection",
      "Audit logs & compliance trails",
    ],
  },
  {
    title: "Operations & Automation",
    items: [
      "WhatsApp Business API integration",
      "Admin dashboards & internal tools",
      "Payment integration (Paystack, Korapay, Monnify)",
      "Email + SMS automation pipelines",
      "Reporting & analytics dashboards",
    ],
  },
];

export function Services() {
  return (
    <section className="bg-[#F8F5F0] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#FF6F3C]">
            Our Services
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0B1B2B] leading-[1.15]">
            What we can build for you.
          </h2>
          <p className="mt-3 text-base text-[#6B7280] max-w-2xl">
            Common projects, grouped by category. If you don&apos;t see your need here, tell
            us anyway — we probably can.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title} className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E5E7EB]">
              <h3 className="text-xl font-bold text-[#0B1B2B] mb-4 pb-4 border-b border-[#E5E7EB]">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#6B7280] leading-relaxed">
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6F3C]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-base text-[#6B7280]">
          Don&apos;t see what you need?{" "}
          <Link href="/contact" className="text-[#FF6F3C] font-semibold hover:underline inline-flex items-center gap-1">
            Tell us what you&apos;re trying to build
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </p>
      </div>
    </section>
  );
}
