"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggeredListProps {
  items: { title: string; description: string; icon?: React.ReactNode }[];
  className?: string;
}

export const StaggeredList = ({ items, className }: StaggeredListProps) => {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-cyan-500/50 hover:bg-zinc-900"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-start gap-4">
            {item.icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400 ring-1 ring-cyan-400/20">
                {item.icon}
              </div>
            )}
            <div>
              <h4 className="text-lg font-bold text-zinc-100">{item.title}</h4>
              <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
