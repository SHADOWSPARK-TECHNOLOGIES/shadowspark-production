"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "row-span-1 rounded-3xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-zinc-950 border border-zinc-800 justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:-translate-y-2 transition duration-200">
        <div className="text-cyan-400 mb-2">{icon}</div>
        <div className="font-sans font-bold text-neutral-100 mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-400 text-xs">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
