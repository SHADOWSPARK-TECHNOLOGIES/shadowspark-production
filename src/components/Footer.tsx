"use client";

import Link from "next/link";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Solutions", href: "/solutions" },
      { label: "Website Systems", href: "#" },
      { label: "WhatsApp AI", href: "#" },
      { label: "Automation", href: "#" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Industries", href: "/industries" },
      { label: "Process", href: "/process" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "System Demo", href: "/checkout/new" },
      { label: "Documentation", href: "#" },
      { label: "API Status", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800 bg-[#050505] px-6 py-16 text-zinc-100 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-1">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-cyan-300">ShadowSpark Technologies</p>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
              Autonomous Revenue Infrastructure
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Websites, WhatsApp AI, and operator systems engineered to qualify and convert traffic with less leakage.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {column.title}
              </p>
              <div className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-zinc-300 transition hover:text-cyan-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          ShadowSpark Technologies — Autonomous Revenue Infrastructure
        </div>
      </div>
    </footer>
  );
}
