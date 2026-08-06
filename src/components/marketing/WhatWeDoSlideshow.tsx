import BentoGrid from "@/components/ui/BentoGrid";

export default function WhatWeDoSlideshow() {
  return (
    <section id="features" className="w-full py-32 flex flex-col items-center">
      <div className="text-center mb-20 px-6">
        <h2 className="text-xs font-mono text-cyan-400 tracking-[0.4em] uppercase mb-4">Precision Services</h2>
        <p className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">Autonomous Architecture.</p>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          We integrate three core modules to build your business ecosystem.
        </p>
      </div>
      
      {/* Reusing existing BentoGrid as it serves the "What We Do" layout perfectly in V1 */}
      <BentoGrid />
    </section>
  );
}
