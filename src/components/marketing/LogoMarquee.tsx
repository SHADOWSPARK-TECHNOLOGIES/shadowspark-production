import React from 'react';
import LeadBranding from '../ui/LeadBranding'; 

const targets = ["apple.com", "stripe.com", "ycombinator.com", "openai.com", "tesla.com"];

export function LogoMarquee() {
  return (
    <div className="w-full py-12 border-y border-white/5 bg-black/50 backdrop-blur-xl">
      <p className="text-[10px] font-mono text-center text-cyan-500/50 uppercase tracking-[0.3em] mb-8">
        INTELLIGENCE_ENGINE_COMPATIBILITY
      </p>
      <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
        {targets.map((domain) => (
          <LeadBranding key={domain} domain={domain} />
        ))}
      </div>
    </div>
  );
}
