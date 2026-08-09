"use client";

import type { ReactNode } from "react";
import KpiCard from "./KpiCard";

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
}

export default function StatCard(props: StatCardProps) {
  return <KpiCard {...props} />;
}
