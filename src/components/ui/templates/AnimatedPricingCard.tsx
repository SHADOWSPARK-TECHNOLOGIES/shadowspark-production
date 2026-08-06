"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

export const AnimatedPricingCard = ({
  tier,
  price,
  features,
  isPopular = false,
}: {
  tier: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ y: isHovered ? -10 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative flex w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] border bg-zinc-950 p-8 shadow-2xl",
        isPopular ? "border-cyan-400" : "border-zinc-800"
      )}
    >
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl bg-cyan-400 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
          Most Popular
        </div>
      )}

      <h3 className="mt-4 text-xl font-medium text-zinc-300">{tier}</h3>
      <div className="my-6 flex items-baseline gap-2">
        <span className="text-5xl font-black text-white">\${price}</span>
        <span className="text-sm font-medium text-zinc-500">/mo</span>
      </div>

      <p className="mb-8 text-sm text-zinc-400">
        Replaces legacy systems and manual overhead.
      </p>

      <ul className="flex flex-col gap-4 flex-1">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <CheckIcon className="h-5 w-5 shrink-0 text-cyan-400" />
            <span className="text-sm text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>

      <motion.button
        animate={{
          backgroundColor: isHovered ? (isPopular ? "#00E5FF" : "#ffffff") : (isPopular ? "#00E5FF" : "#27272a"),
          color: isHovered ? "#000000" : (isPopular ? "#000000" : "#ffffff"),
        }}
        className={cn(
          "mt-8 w-full rounded-full py-4 text-sm font-bold transition-shadow",
          isPopular ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]" : "bg-zinc-800 text-white"
        )}
      >
        Deploy System
      </motion.button>
    </motion.div>
  );
};
