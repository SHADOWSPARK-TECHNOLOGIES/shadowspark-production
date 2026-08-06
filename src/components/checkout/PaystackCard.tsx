import GlassCard from "../ui/GlassCard";
import { ShieldCheck, ArrowRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export default function PaystackCard() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-20">
      <GlassCard className="p-12 md:p-16 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase">
              <ShieldCheck className="w-4 h-4" /> Secure Infrastructure
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Initialize Your<br/><span className="text-cyan-400">System Audit</span>
            </h3>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              Unlock a high-fidelity diagnostic of your current sales and automation funnel. 
              The $10 fee is a credited deposit for your first module.
            </p>
            
            <div className="flex items-center gap-6 opacity-30 grayscale contrast-125">
              <CreditCard className="w-8 h-8 text-cyan-500" />
              <div className="h-6 w-[1px] bg-zinc-800" />
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-cyan-400">Processed by Paystack</span>
            </div>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-2">Audit Fee</div>
            <div className="text-6xl font-black text-white mb-8">$10</div>
            
            <Button size="lg" className="w-full h-16 text-lg rounded-2xl group-hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all" asChild>
              <Link href="/checkout/new" className="flex items-center justify-center gap-3">
                Initialize <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            
            <p className="mt-6 text-[10px] text-zinc-600 font-medium uppercase tracking-tight">
              Includes full report & custom implementation strategy
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
