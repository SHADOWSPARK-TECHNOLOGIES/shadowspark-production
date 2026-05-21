"use client";

import Link from "next/link";
import { ShieldCheck, ChevronRight, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";

export default function CTABlock() {
  return (
    <section className="w-full max-w-5xl px-6 py-20">
      <GlassCard className="p-10 md:p-16 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-left max-w-xl">
            <div className="inline-flex items-center gap-2 mb-6 text-emerald-400 font-mono text-xs uppercase tracking-widest">
              <ShieldCheck className="w-5 h-5" /> Demo Deposit
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              <span className="text-emerald-400">$1 Demo Deposit.</span>
            </h3>
            <p className="text-zinc-400 text-lg mb-4 leading-relaxed">
              A live ShadowSpark system, configured around your funnel, for a symbolic $1.
            </p>
            <ul className="space-y-2 mb-8">
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                We set up a real ShadowSpark instance around your website and WhatsApp flow&mdash;not a generic slide-deck demo.
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                Your $1 deposit is <strong className="text-white">fully credited</strong> toward your first payment if you choose to deploy ShadowSpark.
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                One-time deposit only. No auto-renewal, no hidden subscription.
              </li>
            </ul>
            <Button variant="outline" size="sm" asChild>
              <Link href="#features" className="flex items-center gap-2">
                See System Architecture <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 text-center min-w-[280px]">
            <div className="text-5xl font-black text-white mb-2">$1</div>
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-8">Demo Deposit</div>
            <Button size="lg" className="w-full h-14 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,149,106,0.3)] transition-all" asChild>
              <Link href="/checkout/new" className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Unlock My $1 System Demo
              </Link>
            </Button>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
