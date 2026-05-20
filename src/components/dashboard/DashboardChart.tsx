'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { getChartTheme, chartFontConfig } from '@/lib/dashboard/chart-theme';
import { Skeleton } from '@/components/dashboard/Skeleton';
import { BarChart3, AlertTriangle } from 'lucide-react';

Chart.register(...registerables);

export interface DashboardChartProps {
  type: ChartConfiguration['type'];
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
  loading?: boolean;
  emptyMessage?: string;
  fallback?: React.ReactNode;
  height?: number;
}

/**
 * A client component that initialises a Chart.js instance with theme-aware defaults.
 *
 * - Merges provided `options` with theme defaults (font, grid colour, text colour).
 * - Re-initialises when `data` or `type` changes.
 * - Listens for `data-theme` attribute changes on `<html>` and re-renders the chart.
 * - Cleans up the Chart.js instance on unmount.
 *
 * This eliminates the 3× duplicated Chart.js init patterns across the dashboard.
 */
export default function DashboardChart({
  type,
  data,
  options,
  loading = false,
  emptyMessage,
  fallback,
  height = 300,
}: DashboardChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /** Check whether the provided data is effectively empty. */
  const isDataEmpty = (): boolean => {
    if (!data) return true;
    if (!data.labels || data.labels.length === 0) return true;
    if (!data.datasets || data.datasets.length === 0) return true;
    return data.datasets.every(
      (ds) => !ds.data || ds.data.length === 0,
    );
  };

  const initChart = () => {
    if (!canvasRef.current) return;

    try {
      const theme = getChartTheme();

      // Apply default font config
      Chart.defaults.font.family = chartFontConfig.family;
      Chart.defaults.font.size = chartFontConfig.size;

      // Build theme-aware scale defaults
      const themeGrid = { color: theme.gridColor };
      const themeTicks = { color: theme.textColor };

      // Deep-merge scales with theme defaults
      const userScales = options?.scales as Record<string, unknown> | undefined;
      const mergedScales: Record<string, unknown> = {};

      if (userScales) {
        for (const key of Object.keys(userScales)) {
          const scale = userScales[key] as Record<string, unknown> | undefined;
          mergedScales[key] = {
            ...scale,
            grid: { ...themeGrid, ...(scale?.grid as Record<string, unknown>) },
            ticks: { ...themeTicks, ...(scale?.ticks as Record<string, unknown>) },
          };
        }
      }

      // Deep-merge plugins with theme defaults
      const userPlugins = options?.plugins as Record<string, unknown> | undefined;
      const userLegend = userPlugins?.legend as Record<string, unknown> | undefined;
      const mergedPlugins: Record<string, unknown> = {
        ...userPlugins,
        legend: {
          ...userLegend,
          labels: {
            color: theme.textColor,
            ...(userLegend?.labels as Record<string, unknown>),
          },
        },
      };

      const mergedOptions: Record<string, unknown> = {
        responsive: true,
        maintainAspectRatio: false,
        ...(options as Record<string, unknown>),
        scales: mergedScales,
        plugins: mergedPlugins,
      };

      chartRef.current = new Chart(canvasRef.current, {
        type,
        data,
        options: mergedOptions as ChartConfiguration['options'],
      });

      setError(null);
    } catch (err) {
      console.error('DashboardChart: failed to render chart', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const destroyChart = () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  };

  useEffect(() => {
    if (loading || isDataEmpty()) return;

    destroyChart();
    initChart();

    return () => destroyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, data, options, loading]);

  // Listen for theme changes (data-theme attribute mutations)
  useEffect(() => {
    if (loading || isDataEmpty()) return;

    const observer = new MutationObserver(() => {
      destroyChart();
      initChart();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data]);

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <Skeleton
        width="100%"
        height={height}
        className="w-full"
        aria-label="Loading chart"
        aria-busy="true"
      />
    );
  }

  // ── Empty state ────────────────────────────────────────────────
  if (isDataEmpty()) {
    return (
      <div
        className="flex flex-col items-center justify-center text-zinc-500 text-sm gap-2"
        style={{ height }}
      >
        <BarChart3 className="w-8 h-8 text-zinc-600" />
        <span>{emptyMessage ?? 'No data available'}</span>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className="flex flex-col items-center justify-center text-zinc-500 text-sm gap-2"
        style={{ height }}
      >
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <span className="font-medium">Failed to render chart</span>
        <span className="text-xs text-zinc-600 max-w-xs text-center">
          {error.message}
        </span>
      </div>
    );
  }

  // ── Normal chart rendering ─────────────────────────────────────
  return <canvas ref={canvasRef} height={height} />;
}
