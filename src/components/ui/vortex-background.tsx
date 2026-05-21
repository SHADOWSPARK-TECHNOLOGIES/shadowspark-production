"use client";
import React from "react";

// Placeholder for VortexBackground component
export const Vortex = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 left-2 p-2 border border-dashed border-cyan-500 rounded-lg bg-slate-950/80 z-10">
        <p className="text-cyan-400 text-xs">Vortex Background Placeholder</p>
      </div>
      {children}
    </div>
  );
};
