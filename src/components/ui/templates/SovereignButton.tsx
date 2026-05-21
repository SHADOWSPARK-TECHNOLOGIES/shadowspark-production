"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

type SovereignButtonProps = {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "outline";
  animatePulse?: boolean;
  className?: string;
};

const variantClasses: Record<NonNullable<SovereignButtonProps["variant"]>, string> = {
  primary:
    "bg-[oklch(0.75_0.18_190)] text-black shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:bg-cyan-400",
  secondary:
    "bg-white/5 text-white border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/10",
  outline:
    "border border-zinc-700 bg-transparent text-white hover:border-cyan-400/50 hover:bg-white/5",
};

export function SovereignButton({
  children,
  href,
  variant = "primary",
  animatePulse = false,
  className = "",
}: SovereignButtonProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Link
        href={href}
        className={[
          "group inline-flex items-center justify-center rounded-lg px-8 py-4 font-bold transition-all duration-300",
          variantClasses[variant],
          animatePulse ? "animate-pulse" : "",
          className,
        ].join(" ")}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export default SovereignButton;
