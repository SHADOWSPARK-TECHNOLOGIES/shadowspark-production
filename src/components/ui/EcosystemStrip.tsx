"use client";
import React from "react";
import { Globe, Mail, PhoneCall } from "lucide-react";

export function EcosystemStrip() {
  const logos = [
    {
      name: "Web",
      icon: <Globe className="h-8 w-8" />,
    },
    {
      name: "WhatsApp",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      ),
    },
    {
      name: "Email",
      icon: <Mail className="h-8 w-8" />,
    },
    {
      name: "Meta Social",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <path d="M22.043 14.168a25.32 25.32 0 0 1-5.187 2.138 27.5 27.5 0 0 1-4.819.539c-1.385.03-2.775-.02-4.154-.25A11.137 11.137 0 0 1 3.55 15.11a5.626 5.626 0 0 1-1.593-3.21A5.62 5.62 0 0 1 3.42 8.78c1.378-1.523 3.524-1.564 5.253-.332a6.974 6.974 0 0 1 1.766 1.83c1.077 1.597 1.632 3.493 2.502 5.163.633 1.246 1.602 2.378 2.909 2.802 1.34.437 2.871.213 4.103-.432 1.23-.645 2.05-1.874 2.106-3.242.062-1.52-.77-2.91-2.006-3.69-.993-.628-2.186-.92-3.32-.888-.865.02-1.743.208-2.528.6a8.471 8.471 0 0 0-1.85 1.239l-1.332-1.442a10.05 10.05 0 0 1 2.345-1.637 7.917 7.917 0 0 1 3.32-.816c1.472-.047 2.946.335 4.195 1.09 1.455.876 2.457 2.483 2.535 4.196.082 1.724-.82 3.39-2.228 4.312-1.303.856-2.909 1.216-4.428 1.104-.543-.038-1.092-.128-1.62-.303-1.488-.492-2.617-1.713-3.336-3.08-1.026-1.928-1.658-4.004-2.884-5.75A4.86 4.86 0 0 0 7.373 7.15c-1.282-.676-2.894-.488-3.957.51a3.612 3.612 0 0 0-.964 1.95 3.593 3.593 0 0 0 1.066 3.011c1.233 1.144 2.981 1.54 4.606 1.704 1.485.15 2.993.106 4.475-.027 1.831-.16 3.633-.556 5.372-1.155a23.493 23.493 0 0 0 4.072-1.916Z"/>
        </svg>
      ),
    },
    {
      name: "Voice/Routing",
      icon: <PhoneCall className="h-8 w-8" />,
    },
  ];

  return (
    <div className="w-full border-y border-zinc-800 bg-[#0A0A0A] py-16 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10" />

      <p className="text-center text-sm font-bold uppercase tracking-[0.25em] text-cyan-300/80 mb-12">
        The 5-Channel Unified Intelligence Layer
      </p>

      {/* Infinite scrolling container */}
      <div className="flex w-full whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
        <div className="animate-infinite-scroll flex gap-24 items-center pl-24">
          {logos.concat(logos).concat(logos).map((logo, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-center gap-4 text-[color:var(--spark-cyan)] transition-all hover:scale-110 drop-shadow-[0_0_15px_oklch(0.75_0.18_190/0.4)]"
            >
              {logo.icon}
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 25s linear infinite;
        }
      `}} />
    </div>
  );
}

export default EcosystemStrip;
