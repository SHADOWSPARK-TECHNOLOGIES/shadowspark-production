'use client';

import { MessageCircle } from 'lucide-react';
import Badge from './Badge';

export interface WhatsAppThread {
  name: string;
  avatar: string;
  preview: string;
  unread: number;
  time: string;
}

export interface ThreadListProps {
  threads: WhatsAppThread[];
  onSelect?: (thread: WhatsAppThread) => void;
  activeThread?: string;
  emptyMessage?: string;
}

/**
 * Renders a list of WhatsApp chat threads.
 * Each thread displays an avatar (first letter of name), the contact name,
 * a message preview, an unread badge (if > 0), and a timestamp.
 *
 * When `threads` is empty, null, or undefined, a centered empty state is shown
 * with a MessageCircle icon and a configurable message.
 */
export default function ThreadList({ threads, onSelect, activeThread, emptyMessage }: ThreadListProps) {
  if (!threads || threads.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-12) 0',
          gap: 'var(--space-2)',
          textAlign: 'center',
        }}
        role="list"
        aria-label="WhatsApp threads"
      >
        <MessageCircle className="h-8 w-8 text-zinc-500" />
        <p className="text-zinc-500 text-sm">{emptyMessage || "No conversations yet"}</p>
        <p className="text-zinc-500 text-xs">WhatsApp conversations will appear here</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list" aria-label="WhatsApp threads">
      {threads.map((t, i) => (
        <div
          key={i}
          onClick={() => onSelect?.(t)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3)',
            background: activeThread === t.name ? 'var(--color-surface-dynamic)' : 'var(--color-surface-offset)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              className="avatar"
              style={{
                background: 'var(--color-surface-dynamic)',
                color: 'var(--color-text-muted)',
                fontSize: 11,
              }}
            >
              {t.avatar}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t.preview}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--color-text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {t.time}
            </div>
            {t.unread > 0 && (
              <Badge variant="red" >{t.unread}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
