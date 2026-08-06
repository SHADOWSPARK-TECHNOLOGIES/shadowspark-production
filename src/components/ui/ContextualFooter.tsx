import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ContextualFooterProps = {
  href?: string;
  label: string;
  prefix?: string;
  className?: string;
};

export function ContextualFooter({
  href,
  label,
  prefix = "NEXT",
  className,
}: ContextualFooterProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/3 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300 transition",
        href ? "hover:border-cyan-300/30 hover:bg-cyan-300/6 hover:text-cyan-100" : "",
        className
      )}
    >
      <span className="text-zinc-500">{prefix}:</span>
      <span className="text-white">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-cyan-300" />
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default ContextualFooter;
