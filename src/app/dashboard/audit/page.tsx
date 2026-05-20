'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ChevronRight, Save } from 'lucide-react';

const DashboardChart = dynamic(
  () => import('@/components/dashboard/DashboardChart'),
  { ssr: false }
);
import DashboardModal from '@/components/dashboard/DashboardModal';
import SeverityBadge from '@/components/dashboard/SeverityBadge';
import ProgressBar from '@/components/dashboard/ProgressBar';
import Checklist from '@/components/dashboard/Checklist';
import { AUDIT_DOMAINS, FINDINGS } from '@/lib/dashboard/data';
import type { AuditDomain } from '@/lib/dashboard/types';

export default function AuditPage() {
  const [selectedDomain, setSelectedDomain] = useState<AuditDomain | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set([0, 1]));

  const openDomain = (domain: AuditDomain) => {
    setSelectedDomain(domain);
    setChecked(new Set([0, 1]));
  };

  return (
    <>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Audit Engine
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          ISA 2025 · SEC Circular 26-1 · 5 compliance domains
        </p>
      </div>

      <div className="grid-2-1">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Domain Progress</div>
            <button className="btn btn-ghost" onClick={() => openDomain(AUDIT_DOMAINS[0])}>
              Run Full Audit
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {AUDIT_DOMAINS.map((d, i) => (
              <div
                key={i}
                className="domain-row"
                onClick={() => openDomain(d)}
              >
                <div className="domain-row-header">
                  <div className="domain-name">{d.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className="domain-score" style={{ color: d.color }}>
                      {d.score}%
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-faint)' }} />
                  </div>
                </div>
                <ProgressBar value={d.score} color={d.color} />
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Score Trend</div>
            <div className="card-sub">Last 8 weeks</div>
          </div>
          <DashboardChart
            type="bar"
            data={{
              labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
              datasets: [
                {
                  label: 'Audit Score',
                  data: [61, 64, 67, 70, 72, 74, 76, 78],
                  backgroundColor: [
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.04)',
                    '#00f2ff',
                  ],
                  borderColor: '#00f2ff',
                  borderWidth: 1.5,
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                y: { min: 50, max: 100 },
              },
            }}
            height={200}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">Critical Findings</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {FINDINGS.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface-offset)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className={`briefing-sev sev-${f.sev}`} />
              <div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    marginBottom: 2,
                  }}
                >
                  {f.domain}{' '}
                  <SeverityBadge severity={f.sev} />
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  {f.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Drilldown Modal */}
      <DashboardModal
        open={selectedDomain !== null}
        onClose={() => setSelectedDomain(null)}
        title={selectedDomain?.name ?? ''}
      >
        {selectedDomain && (
          <>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <ProgressBar
                value={selectedDomain.score}
                color={selectedDomain.color}
                showLabel
                height={8}
              />
            </div>

            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                marginBottom: 'var(--space-3)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              ISA 2025 Criteria
            </div>

            <Checklist
              items={selectedDomain.criteria}
              checked={checked}
              onChange={setChecked}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <div
                style={{
                  background: 'var(--color-surface-offset)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--color-text-faint)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Assigned To
                </div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Stephen (ARCHITECT)</div>
              </div>
              <div
                style={{
                  background: 'var(--color-surface-offset)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--color-text-faint)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Deadline
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-warning)',
                  }}
                >
                  30 June 2027
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => setSelectedDomain(null)}>
                <Save size={15} /> Save Progress
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedDomain(null)}>
                Close
              </button>
            </div>
          </>
        )}
      </DashboardModal>
    </>
  );
}
