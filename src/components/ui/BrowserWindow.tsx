import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

type BrowserWindowProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  eyebrow?: string;
  chrome?: ReactNode;
  markdown?: string;
};
const BrowserWindowMarkdown = dynamic(
  () => import("@/components/ui/BrowserWindowMarkdown").then((mod) => mod.BrowserWindowMarkdown),
  { ssr: true }
);

export function BrowserWindow({
  children,
  className,
  contentClassName,
  title = "ShadowSpark Surface",
  eyebrow = "Live environment",
  chrome,
  markdown,
}: BrowserWindowProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(3,7,18,0.92))] shadow-[0_30px_100px_rgba(2,6,23,0.35)]",
        className
      )}
    >
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/80" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-cyan-100/60">
                {eyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-white">{title}</p>
            </div>
          </div>
          {chrome ? <div className="flex items-center gap-3">{chrome}</div> : null}
        </div>
      </div>
      <div className={cn("relative", contentClassName)}>
        {typeof markdown === "string" ? (
          <BrowserWindowMarkdown markdown={markdown} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default BrowserWindow;
