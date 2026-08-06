"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./button";

export default function HeroVoid() {
  const [mounted, setMounted] = useState(false);
  const [aiStatus, setAiStatus] = useState<"active" | "thinking" | "latent">("latent");
  
  // Spring physics for the "Sovereign Link" / Sentient Orb
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    setMounted(true);
    // Center initially (offset by half the orb's width/height)
    mouseX.set(window.innerWidth / 2 - 200);
    mouseY.set(window.innerHeight / 2 - 200);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 200);
      mouseY.set(e.clientY - 200);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/ai/health");
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        setAiStatus(data.status);
      } catch (err) {
        setAiStatus("latent");
      }
    };

    // Initial fetch
    fetchHealth();

    // Poll every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#000000] overflow-hidden flex flex-col items-center justify-center">
      {/* Sentient Orb - Follows mouse with spring physics */}
      {mounted && (
        <motion.div
          animate={aiStatus === "thinking" ? { scale: [1, 1.2, 1], opacity: [0.6, 0.8, 0.6], filter: "brightness(1.5)" } : { scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4], filter: "brightness(1.2)" }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ x: springX, y: springY }}
          className="absolute left-0 top-0 w-[400px] h-[400px] bg-[#00FFFF]/20 rounded-full blur-[120px] pointer-events-none"
        />
      )}

      {/* Deep Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

      {/* Void Content */}
      <div className="relative z-10 text-center flex flex-col items-center px-6 max-w-4xl">
        {/* Dynamic AI Status Indicator */}
        <div className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-[#00FFFF]/30 bg-[#00FFFF]/10 text-[#00FFFF] text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <span className={`w-2 h-2 rounded-full ${aiStatus === 'thinking' ? 'bg-white animate-ping' : 'bg-[#00FFFF]'}`}></span>
          AI Engine {aiStatus}
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-10 text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-[#00FFFF]">
          Intelligence for the<br />Sovereign Founder.
        </h1>
        
        {/* Liquid Cyan CTA */}
        <div className="relative group mt-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00FFFF] to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
          <Button 
            size="lg" 
            className="relative h-16 px-10 text-lg rounded-xl bg-black border border-[#00FFFF]/50 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-all duration-300 font-extrabold tracking-wide" 
            asChild
          >
            <Link href="/checkout/new">
              Deploy $10 Audit
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
