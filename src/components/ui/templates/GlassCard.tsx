"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type GlassCardProps = Omit<HTMLMotionProps<"div">, "title"> & {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  highlighted?: boolean;
  className?: string;
};

export function GlassCard({
  title,
  description,
  icon,
  children,
  highlighted = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-100 backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(2,8,23,0.3)]",
        highlighted && "border-cyan-400/40 bg-cyan-400/8",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_55%)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.5rem-1px)] bg-white/2" />

      <div className="flex items-start gap-4">
        {icon ? (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
            {icon}
          </div>
        ) : null}

        <div className="relative flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-300/80">{description}</p>
          ) : null}
        </div>
      </div>

      {children ? <div className="relative mt-5">{children}</div> : null}
    </motion.div>
  );
}

export default GlassCard;
