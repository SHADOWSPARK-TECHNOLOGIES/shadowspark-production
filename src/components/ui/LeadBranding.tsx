import React from 'react';

/** * YOLO: Branding Injector
 * Scrapes high-res identity from domain and binds it to the Obsidian HUD.
 */
export default function LeadBranding({ domain }: { domain: string }) {
  const brandLogo = `https://logo.clearbit.com/${domain}?size=128`;
  
  return (
    <div className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border border-white/10 shadow-lg">
      <div className="h-12 w-12 rounded-lg bg-black border border-cyan-500/30 overflow-hidden flex items-center justify-center p-2">
        <img 
          src={brandLogo} 
          alt="Target Logo" 
          className="w-full h-full object-contain"
          onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${domain}&background=0D1117&color=08D9D6`}
        />
      </div>
      <div>
        <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Target_Identity</p>
        <h3 className="text-lg font-bold text-white uppercase tracking-tight">{domain}</h3>
      </div>
    </div>
  );
}
