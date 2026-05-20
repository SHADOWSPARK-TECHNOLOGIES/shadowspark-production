import type { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'green' | 'red' | 'orange' | 'blue' | 'muted' | 'primary';
  children: ReactNode;
}

/**
 * A dashboard badge using the `dashboard-badge` CSS class with a variant modifier.
 *
 * Renders `<span class="dashboard-badge badge-{variant}">{children}</span>`.
 */
export default function Badge({ variant = 'muted', children }: BadgeProps) {
  return (
    <span className={`dashboard-badge badge-${variant}`}>{children}</span>
  );
}
