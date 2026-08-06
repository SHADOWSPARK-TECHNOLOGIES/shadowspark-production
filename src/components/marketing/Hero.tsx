"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMarquee } from "@/components/marketing/LogoMarquee";

export default function Hero() {
  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center border-b border-white/5 relative bg-black">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video 
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover opacity-30 pointer-events-none"
          autoPlay 
          muted 
          loop 
          playsInline
          poster="/assets/video-poster.jpg"
        >
          <source src="/assets/shadowspark-v1-trailer.mp4" type="video/mp4" />
        </video>
        {/* Gradient Overlay to fade into the black background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
      </div>

      <section className="relative w-full pt-32 pb-16 flex flex-col items-center text-center px-6 overflow-hidden z-10">
        
        <div className="relative max-w-4xl mt-12 mb-20">
          <div className="inline-block mb-8 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(16,149,106,0.15)] backdrop-blur-md">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            System Live
          </div>
          
          {/* The Hook */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-emerald-400 drop-shadow-[0_0_40px_rgba(16,149,106,0.1)]">
            AUTONOMOUS REVENUE INTELLIGENCE
          </h1>
          <h2 className="text-2xl sm:text-3xl text-blue-500 font-bold mb-8">
            Stop Losing Leads to Manual Friction
          </h2>
          
          {/* The Proof */}
          <p className="text-zinc-400 text-lg md:text-2xl font-medium max-w-3xl mx-auto mb-16 leading-relaxed">
            ShadowSpark audits your inbound traffic in real-time, identifies conversion leaks, and deploys autonomous AI agents to secure the deal—all before your team even opens their email.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* The Trigger */}
            <Button size="lg" className="h-16 px-10 text-lg rounded-xl font-mono uppercase tracking-widest font-extrabold group bg-emerald-500 text-black hover:bg-emerald-500/80 shadow-[0_0_30px_rgba(16,149,106,0.3)] transition-all" asChild>
              <Link href="/checkout/new" className="flex items-center gap-3">
                [ RUN SYSTEM AUDIT — $1 ] <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Link 
              href="https://wa.me/2349000000000" 
              target="_blank"
              className="flex items-center gap-2 text-zinc-400 hover:text-white font-mono text-sm tracking-widest transition-colors uppercase mt-4 sm:mt-0"
            >
              <MessageCircle className="w-5 h-5 text-emerald-500" /> Consult Architect
            </Link>
          </div>
        </div>
      </section>
      
      {/* Trust Marquee Component */}
      <div className="w-full relative z-10 mt-auto">
         <LogoMarquee />
      </div>
    </div>
  );
}
