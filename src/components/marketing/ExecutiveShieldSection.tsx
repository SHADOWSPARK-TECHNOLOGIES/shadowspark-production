/**
 * ExecutiveShieldSection — Anti-Deepfake Identity Infrastructure
 *
 * Obsidian HUD Edition.
 * Renders the Executive Shield section with OrbitalScanRing, highlighting
 * Shadowspark's anti-deepfake identity infrastructure for institutional
 * trust reinforcement.
 */

import { OrbitalScanRing } from "@/components/marketing/OrbitalScanRing";

export function ExecutiveShieldSection() {
  return (
    <section className="relative border-t border-white/5 py-24">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,149,106,0.04),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Section badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          The Executive Shield
        </div>

        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl golden-transition">
          Anti-Deepfake Identity Infrastructure
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 font-sans">
          69% of biometric fraud is now AI-generated. Shadowspark deploys
          Active Liveness + Passive Behavioral Biometrics to secure every
          identity verification — hardware-backed FIDO2, liveness detection,
          and behavioral profiling that runs silently in the background.
        </p>

        {/* Orbital Scan Ring */}
        <div className="mt-12 flex justify-center">
          <OrbitalScanRing />
        </div>
      </div>
    </section>
  );
}

export default ExecutiveShieldSection;
