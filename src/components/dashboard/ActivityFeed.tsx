'use client';

import type { ReactNode } from 'react';
import { Activity } from 'lucide-react';

export interface ActivityEvent {
  dotColor: string;
  text: string;
  time: string;
}

export interface ActivityFeedProps {
  items: ActivityEvent[];
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  emptyMessage?: string;
}

/**
 * Renders a dashboard card containing a list of activity events.
 *
 * Each event displays a colored dot, the event text, and a timestamp.
 * An optional `title` renders a card header, and an optional `subtitle` renders
 * a `card-sub` element beside the title. Optional `children` are rendered in the
 * card header area (e.g. for action buttons).
 *
 * When `items` is empty, null, or undefined, a centered empty state is shown
 * with an Activity icon and a configurable message.
 */
export default function ActivityFeed({ items, title, subtitle, children, emptyMessage }: ActivityFeedProps) {
  if (!items || items.length === 0) {
    return (
      <div className="dashboard-card">
        {title && (
          <div className="card-header">
            <div>
              <div className="card-title">{title}</div>
              {subtitle && <div className="card-sub">{subtitle}</div>}
            </div>
            {children}
          </div>
        )}
        <div className="activity-list" role="feed" aria-label={title || "Activity feed"}>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-8 w-8 text-zinc-500 mb-2" />
            <p className="text-zinc-500 text-sm">{emptyMessage || "No recent activity"}</p>
            <p className="text-zinc-500 text-xs mt-1">Activity will appear here as events are processed</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      {title && (
        <div className="card-header">
          <div>
            <div className="card-title">{title}</div>
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {children}
        </div>
      )}
      <div className="activity-list" role="feed" aria-label={title || "Activity feed"}>
        {items.map((item, i) => (
          <div key={i} className="activity-item">
            <span className="activity-dot" style={{ background: item.dotColor }} />
            <div className="activity-body">
              <span
                className="activity-text"
                dangerouslySetInnerHTML={{ __html: item.text }}
              />
              <span className="activity-time">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
