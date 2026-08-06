"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const slides = [
  {
    title: "Turn WhatsApp Conversations into Revenue",
    subtitle: "Autonomous AI agents that qualify, sell, and close 24/7.",
  },
  {
    title: "High-Performance Web Ecosystems",
    subtitle: "Next.js architecture built for the Nigerian business scale.",
  },
  {
    title: "Intelligence-Driven Automation",
    subtitle: "Stop leaking leads. Start scaling precision operations.",
  }
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="text-center px-4"
        >
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white mb-6">
            {slides[current].title}
          </h1>
          <p className="text-zinc-400 text-lg md:text-2xl font-medium max-w-3xl mx-auto">
            {slides[current].subtitle}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
