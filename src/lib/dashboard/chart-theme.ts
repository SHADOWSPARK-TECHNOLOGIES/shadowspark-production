// ─── Chart.js Theme Utilities ───
// Extracts the duplicated Chart.js theme detection pattern from dashboard pages.

export interface ChartTheme {
  isDark: boolean;
  gridColor: string;
  textColor: string;
  primary: string;
  bg: string;
}

/**
 * Returns theme-aware Chart.js colors based on the document's `data-theme` attribute.
 * Checks `document.documentElement.getAttribute('data-theme') !== 'light'` to determine
 * whether the current theme is dark.
 */
export function getChartTheme(): ChartTheme {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  return {
    isDark,
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    primary: isDark ? '#00f2ff' : '#059669',
    bg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  };
}

/**
 * Default font configuration for Chart.js dashboards.
 * Uses IBM Plex Mono for the monospaced, technical "Command Centre" aesthetic.
 */
export const chartFontConfig = {
  family: "'IBM Plex Mono', monospace",
  size: 11,
};
