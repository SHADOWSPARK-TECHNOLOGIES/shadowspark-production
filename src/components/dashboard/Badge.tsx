import type { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'green' | 'red' | 'orange' | 'blue' | 'muted' | 'primary' | 'outline' | 'secondary';
  children: ReactNode;
}

const VARIANT_MAP: Record<string, string> = {
  outline: 'muted',
  secondary: 'muted',
};

/**
 * A dashboard badge using the `dashboard-badge` CSS class with a variant modifier.
 *
 * Renders `<span class="dashboard-badge badge-{variant}">{children}</span>`.
 */
export default function Badge({ variant = 'muted', children }: BadgeProps) {
  const resolved = VARIANT_MAP[variant] ?? variant;
  return (
    <span className={`dashboard-badge badge-${resolved}`}>{children}</span>
  );
}
