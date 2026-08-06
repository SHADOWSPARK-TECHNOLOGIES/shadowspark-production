'use client';

import type { ReactNode } from 'react';

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
}

/**
 * A single KPI card displaying an icon, label, value, and optional delta indicator.
 * Renders a `div.kpi-card` with the dashboard's dark executive aesthetic.
 */
export default function KpiCard({ icon, label, value, delta, deltaType }: KpiCardProps) {
  return (
    <div className="kpi-card" role="region" aria-label={label}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta delta-${deltaType ?? 'neutral'}`}>{delta}</div>
      )}
    </div>
  );
}
