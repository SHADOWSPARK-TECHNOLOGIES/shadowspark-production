'use client';

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
}

/**
 * A reusable progress bar using the dashboard's `prog-bar-wrap` / `prog-bar` CSS classes.
 *
 * - `value`: current progress value
 * - `max`: maximum value (default `100`)
 * - `color`: CSS color for the fill (default `'#00f2ff'`)
 * - `showLabel`: renders "value/max" text beside the bar
 * - `height`: bar height in px (default `6`)
 */
export default function ProgressBar({
  value,
  max = 100,
  color = '#00f2ff',
  showLabel = false,
  height = 6,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div className="prog-bar-wrap" style={{ flex: 1, height }}>
        <div
          className="prog-bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="score-num" style={{ fontSize: 11 }}>
          {value}/{max}
        </span>
      )}
    </div>
  );
}
