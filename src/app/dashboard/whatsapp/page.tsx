'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { THREADS, BOT_REPLIES } from '@/lib/dashboard/data';
import ChatMessage from '@/components/dashboard/ChatMessage';
import ThreadList from '@/components/dashboard/ThreadList';
import ProgressBar from '@/components/dashboard/ProgressBar';

const RAG_METRICS = [
  { label: 'Intent Match Rate', value: 94.2, color: 'var(--color-success)' },
  { label: 'RAG Retrieval Accuracy', value: 87.6, color: 'var(--color-primary)' },
  { label: 'Demo Conversion Rate', value: 12.4, color: 'var(--color-warning)' },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState([
    {
      role: 'bot' as const,
      text: "👋 Hello! I'm ClawBot, ShadowSpark's AI assistant. How can I help you with compliance automation today?",
      time: '10:02 AM',
    },
    {
      role: 'user' as const,
      text: 'What are the new SEC capital requirements for 2026?',
      time: '10:03 AM',
    },
    {
      role: 'bot' as const,
      text: 'Great question! Under SEC Circular 26-1 (ISA 2025), capital thresholds were raised significantly across all market operator categories as of January 16, 2026. For example, non-bank custodians went from ₦200M → ₦50B. Robo-advisers now require ₦100M minimum. Full compliance deadline is June 30, 2027.',
      time: '10:03 AM',
    },
    {
      role: 'user' as const,
      text: 'Can ShadowSpark help us track this?',
      time: '10:04 AM',
    },
    {
      role: 'bot' as const,
      text: 'Absolutely — our Regulatory Watchtower scans SEC, CBN, and FIRS portals every Monday and delivers a formatted briefing directly to your WhatsApp. Want to book a demo? I can schedule one for you right now 📅',
      time: '10:04 AM',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const botIdx = useRef(0);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = () => {
    const txt = input.trim();
    if (!txt) return;

    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    setMessages((prev) => [...prev, { role: 'user', text: txt, time }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: BOT_REPLIES[botIdx.current % BOT_REPLIES.length],
          time,
        },
      ]);
      botIdx.current++;
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          WhatsApp AI
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          ClawBot · App ID 24260677440297544 · RAG-powered
        </p>
      </div>

      <div className="grid-2">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Live Chat Preview</div>
            <span className="dashboard-badge badge-green">● Online</span>
          </div>
          <div className="chat-area" ref={chatRef}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} text={msg.text} time={msg.time} />
            ))}
            {isTyping && (
              <div className="msg msg-bot">
                <div className="msg-bubble">
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-primary" onClick={sendMessage}>
              <Send size={15} />
            </button>
          </div>
        </div>

        <div>
          <div className="dashboard-card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header">
              <div className="card-title">Active Threads</div>
              <div className="card-sub">Last 24 hours</div>
            </div>
            <ThreadList threads={THREADS} />
          </div>

          <div className="dashboard-card">
            <div className="card-header" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="card-title">RAG Performance</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {RAG_METRICS.map((m, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)' }}>{m.label}</span>
                  </div>
                  <ProgressBar value={m.value} max={100} color={m.color} showLabel />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
