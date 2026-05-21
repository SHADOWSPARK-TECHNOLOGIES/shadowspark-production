"use client";
import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export const MagneticDock = ({ items, className }: { items: { title: string, icon: React.ReactNode, href: string }[], className?: string }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 items-end gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 pb-3 shadow-[0_0_30px_rgba(0,229,255,0.1)] backdrop-blur-md",
        className
      )}
    >
      {items.map((item, idx) => (
        <DockIcon mouseX={mouseX} key={idx} href={item.href}>
          {item.icon}
        </DockIcon>
      ))}
    </motion.div>
  );
};

function DockIcon({
  mouseX,
  href,
  children,
}: {
  mouseX: any;
  href: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <a href={href}>
      <motion.div
        ref={ref}
        style={{ width }}
        className="flex aspect-square items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-colors hover:bg-cyan-400 hover:text-black"
      >
        {children}
      </motion.div>
    </a>
  );
}
