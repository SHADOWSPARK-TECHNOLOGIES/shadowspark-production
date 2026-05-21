import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#0A0A0A]/60 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]",
      className
    )}>
      {children}
    </div>
  );
}
