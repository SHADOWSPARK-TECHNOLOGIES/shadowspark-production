'use client';

export interface ChatMessageProps {
  role: 'bot' | 'user';
  text: string;
  time: string;
}

/**
 * Renders a chat message bubble with appropriate alignment.
 * - `bot` messages are left-aligned (`msg-bot`)
 * - `user` messages are right-aligned (`msg-user`)
 *
 * Uses the `msg` / `msg-bubble` / `msg-time` CSS classes from the dashboard.
 */
export default function ChatMessage({ role, text, time }: ChatMessageProps) {
  return (
    <div className={`msg msg-${role}`} aria-label={role === 'bot' ? 'Bot message' : 'User message'}>
      <div className="msg-bubble">{text}</div>
      <div className="msg-time">{time}</div>
    </div>
  );
}
