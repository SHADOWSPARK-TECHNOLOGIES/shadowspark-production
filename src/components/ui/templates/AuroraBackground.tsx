"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface AuroraBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[#0A0A0A] text-zinc-100",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.86)_0%,rgba(10,10,10,0.96)_55%,#0A0A0A_100%)]" />
        <div
          className={cn(
            "aurora-layer absolute -left-[14%] top-[-16%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.18)_0%,rgba(0,229,255,0.07)_32%,transparent_70%)] blur-3xl",
            showRadialGradient &&
              "[mask-image:radial-gradient(circle_at_center,black_18%,transparent_72%)]"
          )}
        />
        <div className="aurora-layer-delayed absolute right-[-12%] top-[6%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.14)_0%,rgba(0,229,255,0.05)_35%,transparent_72%)] blur-3xl" />
        <div className="aurora-band absolute left-1/2 top-[16%] h-[20rem] w-[78rem] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(0,229,255,0.02)_12%,rgba(0,229,255,0.14)_34%,rgba(0,229,255,0.08)_55%,transparent_82%)] blur-3xl" />
        <div className="aurora-layer-soft absolute left-[18%] top-[28%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.1)_0%,rgba(0,229,255,0.03)_40%,transparent_72%)] blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(0,229,255,0.06),transparent)]" />
      </div>

      <div className="relative z-10">{children}</div>

      <style jsx>{`
        @keyframes aurora-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.42;
          }
          50% {
            transform: translate3d(4%, 3%, 0) scale(1.04);
            opacity: 0.6;
          }
          100% {
            transform: translate3d(-3%, 7%, 0) scale(0.98);
            opacity: 0.46;
          }
        }

        @keyframes aurora-drift-delayed {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.34;
          }
          50% {
            transform: translate3d(-5%, 4%, 0) scale(1.03);
            opacity: 0.52;
          }
          100% {
            transform: translate3d(4%, -1%, 0) scale(0.97);
            opacity: 0.38;
          }
        }

        @keyframes aurora-band-sweep {
          0% {
            transform: translateX(-50%) translateY(0) scaleX(1);
            opacity: 0.24;
          }
          50% {
            transform: translateX(-50%) translateY(2%) scaleX(1.03);
            opacity: 0.42;
          }
          100% {
            transform: translateX(-50%) translateY(-1%) scaleX(0.99);
            opacity: 0.28;
          }
        }

        @keyframes aurora-soft-pulse {
          0% {
            transform: translate3d(0, 0, 0) scale(0.96);
            opacity: 0.18;
          }
          50% {
            transform: translate3d(2%, -2%, 0) scale(1.04);
            opacity: 0.3;
          }
          100% {
            transform: translate3d(-2%, 2%, 0) scale(0.98);
            opacity: 0.2;
          }
        }

        .aurora-layer {
          animation: aurora-drift 24s ease-in-out infinite alternate;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .aurora-layer-delayed {
          animation: aurora-drift-delayed 28s ease-in-out infinite alternate;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .aurora-band {
          animation: aurora-band-sweep 30s ease-in-out infinite alternate;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .aurora-layer-soft {
          animation: aurora-soft-pulse 26s ease-in-out infinite alternate;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-layer,
          .aurora-layer-delayed,
          .aurora-band,
          .aurora-layer-soft {
            animation: none;
            opacity: 0.24;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};
