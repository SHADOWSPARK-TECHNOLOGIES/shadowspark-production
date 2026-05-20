import Badge from './Badge';

export interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const SEVERITY_MAP: Record<SeverityBadgeProps['severity'], 'red' | 'orange' | 'blue' | 'muted'> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'muted',
};

/**
 * Maps a severity level to a badge variant and renders a `<Badge>`.
 * - critical → red
 * - high → orange
 * - medium → blue
 * - low → muted
 */
export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return <Badge variant={SEVERITY_MAP[severity]}>{severity}</Badge>;
}
