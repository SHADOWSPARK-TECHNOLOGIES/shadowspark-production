import { MessageCircle, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

const FacebookIcon = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const SovereignFooter = () => {
  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* TRUST SIGNALS */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16 opacity-50 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-500" />
            <span className="text-xs font-bold tracking-widest uppercase text-white">TLS 1.3 IN TRANSIT</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="text-cyan-500" />
            <span className="text-xs font-bold tracking-widest uppercase text-white">AES-256 ENCRYPTION AT REST</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-cyan-500" />
            <span className="text-xs font-bold tracking-widest uppercase text-white">NDPR-COMPLIANT DATA HANDLING</span>
          </div>
        </div>

        {/* SOCIAL & COMMAND LINKS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">
              SHADOWSPARK
            </h2>
            <p className="text-neutral-500 text-sm mt-2">Autonomous Revenue Infrastructure</p>
          </div>

          <div className="flex gap-10">
            {/* FACEBOOK LINK */}
            <a 
              href="https://facebook.com/your-page" 
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col items-center gap-2 text-neutral-400 hover:text-cyan-500 transition-all"
            >
              <FacebookIcon size={28} className="group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
              <span className="text-[10px] uppercase tracking-tighter">Facebook</span>
            </a>

            {/* WHATSAPP LINK */}
            <a 
              href="https://wa.me/your-number" 
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col items-center gap-2 text-neutral-400 hover:text-cyan-500 transition-all"
            >
              <MessageCircle size={28} className="group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
              <span className="text-[10px] uppercase tracking-tighter">WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-16 text-center border-t border-white/5 pt-8">
          <p className="text-neutral-600 text-[10px] tracking-[0.2em] uppercase">
            Designed for the EliteBook 840 G6 Deployment Stack
          </p>
        </div>
      </div>
    </footer>
  );
};
