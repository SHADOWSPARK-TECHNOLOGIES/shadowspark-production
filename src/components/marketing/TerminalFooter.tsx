/**
 * TerminalFooter — Sovereign Financial Node Footer
 *
 * Obsidian HUD Edition.
 * Minimalist footer with Shadowspark branding, node status indicator,
 * and version information.
 */

import { SovereignLogo } from "@/components/marketing/SovereignLogo";

export function TerminalFooter() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <SovereignLogo size={28} animated={false} variant="emerald" />
            <span className="text-sm font-bold tracking-tight text-white font-sans">
              SHADOWSPARK
            </span>
          </div>

          <p className="text-[10px] font-mono tracking-[0.15em] text-zinc-700">
            SOVEREIGN FINANCIAL NODE — LAGOS MAINNET
          </p>

          <div className="flex items-center gap-6 text-[11px] text-zinc-600">
            <span>v1.0.0</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default TerminalFooter;
