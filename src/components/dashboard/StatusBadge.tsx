import Badge from './Badge';

export interface StatusBadgeProps {
  status: 'hot' | 'warm' | 'cold';
}

const STATUS_MAP: Record<StatusBadgeProps['status'], 'red' | 'orange' | 'muted'> = {
  hot: 'red',
  warm: 'orange',
  cold: 'muted',
};

/**
 * Maps a lead status to a badge variant and renders a `<Badge>`.
 * - hot → red
 * - warm → orange
 * - cold → muted
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={STATUS_MAP[status]}>{status}</Badge>;
}
