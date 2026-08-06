'use client';

import KpiCard from './KpiCard';
import type { KpiCardProps } from './KpiCard';

export interface KpiGridProps {
  items: KpiCardProps[];
}

/**
 * Renders a grid of KPI cards inside a `div.kpi-grid`.
 * Maps over the provided items and renders a `<KpiCard>` for each.
 */
export default function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="kpi-grid">
      {items.map((item, i) => (
        <KpiCard key={i} {...item} />
      ))}
    </div>
  );
}
