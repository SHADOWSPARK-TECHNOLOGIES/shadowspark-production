'use client';

import { useState } from 'react';
import { Zap, Copy, Download, FileText, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { BRIEFING_ITEMS, WATCHTOWER_ALERTS } from '@/lib/dashboard/data';
import KpiGrid from '@/components/dashboard/KpiGrid';
import type { KpiCardProps } from '@/components/dashboard/KpiCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import SeverityBadge from '@/components/dashboard/SeverityBadge';

const KPI_ITEMS: KpiCardProps[] = [
  {
    icon: <FileText size={18} />,
    label: 'SEC Circulars',
    value: '7',
    delta: '↑ 2 new this month',
    deltaType: 'up',
  },
  {
    icon: <AlertTriangle size={18} />,
    label: 'CBN Alerts',
    value: '4',
    delta: '↑ Recapitalisation final',
    deltaType: 'up',
  },
  {
    icon: <TrendingUp size={18} />,
    label: 'FIRS Updates',
    value: '3',
    delta: '→ Dev Levy active',
    deltaType: 'neutral',
  },
  {
    icon: <Calendar size={18} />,
    label: 'Next Scan',
    value: 'Mon',
    delta: '5 May · 08:00 WAT',
    deltaType: 'neutral',
  },
];

export default function WatchtowerPage() {
  const [briefingVisible, setBriefingVisible] = useState(false);

  const generateBriefing = () => {
    setBriefingVisible(true);
    setTimeout(() => {
      document.getElementById('briefing-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const copyBriefing = () => {
    const text =
      `ShadowSpark Monday Regulatory Briefing — 5 May 2026\n\n` +
      BRIEFING_ITEMS.map((b) => `[${b.reg}/${b.sev.toUpperCase()}] ${b.desc}`).join('\n\n');
    navigator.clipboard?.writeText(text);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Regulatory Watchtower
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            SEC · CBN · FIRS — auto-scans every Monday 08:00 WAT
          </p>
        </div>
        <button className="btn btn-primary" onClick={generateBriefing}>
          <Zap size={15} /> Generate Monday Briefing
        </button>
      </div>

      <KpiGrid items={KPI_ITEMS} />

      {/* Briefing Output */}
      {briefingVisible && (
        <div className="briefing-card" id="briefing-output">
          <div className="briefing-header">
            <div className="briefing-title">ShadowSpark Monday Regulatory Briefing</div>
            <div className="briefing-date">Generated: Monday, 5 May 2026 · 08:00 WAT</div>
          </div>
          <div id="briefing-items">
            {BRIEFING_ITEMS.map((b, i) => (
              <div key={i} className="briefing-item">
                <div className={`briefing-sev sev-${b.sev}`} />
                <div className="briefing-content">
                  <div className="briefing-regulator">
                    {b.reg} — <SeverityBadge severity={b.sev} />
                  </div>
                  <div className="briefing-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-5)',
              flexWrap: 'wrap',
            }}
          >
            <button className="btn btn-primary" onClick={copyBriefing}>
              <Copy size={15} /> Copy to WhatsApp
            </button>
            <button className="btn btn-ghost">
              <Download size={15} /> Export PDF
            </button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <ActivityFeed
          title="SEC Circulars"
          subtitle="ISA 2025 / Circular 26-1"
          items={WATCHTOWER_ALERTS.slice(0, 1)}
        />
        <ActivityFeed
          title="CBN & FIRS Updates"
          items={WATCHTOWER_ALERTS.slice(1)}
        />
      </div>
    </>
  );
}
