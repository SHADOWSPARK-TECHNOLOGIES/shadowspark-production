"use client";

import Image from "next/image";
import { Globe, Mail, PhoneCall, type LucideIcon } from "lucide-react";

type EcosystemItem =
  | {
      label: string;
      icon: LucideIcon;
      asset?: never;
    }
  | {
      label: string;
      icon?: never;
      asset: string;
    };

const ecosystemItems: EcosystemItem[] = [
  { label: "Web", icon: Globe },
  { label: "WhatsApp", asset: "/ecosystem/whatsapp.svg" },
  { label: "Email", icon: Mail },
  { label: "Meta", asset: "/ecosystem/meta.svg" },
  { label: "Voice Routing", icon: PhoneCall },
];

const ribbonItems = [...ecosystemItems, ...ecosystemItems];

export function EcosystemStrip() {
  return (
    <section className="overflow-hidden border-y border-white/10 bg-[#0A0A0A] py-14">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300/75">
          A Unified Intelligence Layer. Integrated across your entire customer lifecycle.
        </p>
      </div>

      <div className="mt-8 overflow-hidden">
        <div className="ecosystem-ribbon flex min-w-max items-center gap-4 pr-4">
          {ribbonItems.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex min-w-[13rem] items-center gap-3 rounded-full border border-cyan-400/20 bg-[#061017] px-5 py-3 text-cyan-200 shadow-[0_0_18px_rgba(0,229,255,0.08)] backdrop-blur-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 shadow-[0_0_20px_rgba(0,229,255,0.18)]">
                {"icon" in item && item.icon ? (
                  (() => {
                    const Icon = item.icon;
                    return <Icon className="h-5 w-5 text-[#00E5FF] blur-[0.2px]" />;
                  })()
                ) : (
                  <Image
                    src={item.asset}
                    alt={item.label}
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] blur-[0.2px]"
                  />
                )}
              </span>
              <span className="text-sm font-medium tracking-[0.18em] text-cyan-100/90 uppercase">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ecosystem-marquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .ecosystem-ribbon {
          animation: ecosystem-marquee 24s linear infinite;
          will-change: transform;
        }

        @media (max-width: 768px) {
          .ecosystem-ribbon {
            animation-duration: 18s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ecosystem-ribbon {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

export default EcosystemStrip;
