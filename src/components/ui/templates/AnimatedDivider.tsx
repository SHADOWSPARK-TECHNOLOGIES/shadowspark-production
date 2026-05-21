"use client";

import { motion } from "framer-motion";

type AnimatedDividerProps = {
  height?: number;
  flip?: boolean;
};

export function AnimatedDivider({ height = 80, flip = false }: AnimatedDividerProps) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyan-500/20" />
      <motion.div
        className="absolute top-1/2 h-px w-40 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ x: ["-10%", "110%"] }}
        transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
      />
    </div>
  );
}

export default AnimatedDivider;
