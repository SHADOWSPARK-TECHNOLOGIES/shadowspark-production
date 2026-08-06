'use client';

import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { LEADS, SCORE_DIMS } from '@/lib/dashboard/data';
import type { Lead } from '@/lib/dashboard/types';
import type { ScoreDimension } from '@/components/dashboard/ScoreBreakdown';
import DashboardModal from '@/components/dashboard/DashboardModal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import ProgressBar from '@/components/dashboard/ProgressBar';
import ScoreBreakdown from '@/components/dashboard/ScoreBreakdown';
import Badge from '@/components/dashboard/Badge';

const SCORE_DIMENSIONS: ScoreDimension[] = SCORE_DIMS.map((d) => ({
  label: d.label,
  score: d.val,
  max: 100,
}));

function scoreColor(score: number): string {
  if (score > 80) return 'var(--color-success)';
  if (score > 60) return 'var(--color-gold)';
  return 'var(--color-notification)';
}

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');

  const filtered = LEADS.filter(
    (l) =>
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="card-header">
        <div>
          <h2 className="card-title">Leads</h2>
          <p className="card-sub">
            {LEADS.length} total · {LEADS.filter((l) => l.status === 'hot').length} hot ·{' '}
            {LEADS.filter((l) => l.status === 'warm').length} warm
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <input
            className="chat-input"
            style={{ width: 200 }}
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary">
            <Plus size={15} /> Add Lead
          </button>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* ── Desktop Table ── */}
        <div className="table-wrap hidden md:block">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="hidden md:table-cell">Sector</th>
                <th className="hidden md:table-cell">Source</th>
                <th>Status</th>
                <th>Score</th>
                <th className="hidden md:table-cell">Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr key={i} onClick={() => setSelectedLead(lead)}>
                  <td>
                    <strong>{lead.company}</strong>
                  </td>
                  <td className="hidden md:table-cell">
                    <Badge variant="muted">{lead.sector}</Badge>
                  </td>
                  <td className="hidden md:table-cell">{lead.source}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div className="score-bar-cell">
                        <ProgressBar value={lead.score} color={scoreColor(lead.score)} />
                      </div>
                      <span className="score-num">{lead.score}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>{lead.date}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLead(lead);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card List ── */}
        <div className="block md:hidden divide-y divide-zinc-800">
          {filtered.map((lead, i) => (
            <div
              key={i}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 m-3 cursor-pointer transition hover:border-zinc-700"
              onClick={() => setSelectedLead(lead)}
            >
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-zinc-100 font-medium text-sm">{lead.company}</h3>
                <StatusBadge status={lead.status} />
              </div>

              {/* Score with progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-500 text-xs">Score</span>
                  <span className="text-zinc-300 text-sm font-medium">{lead.score}</span>
                </div>
                <ProgressBar value={lead.score} color={scoreColor(lead.score)} />
              </div>

              {/* Compact detail grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-zinc-500 text-xs">Source</p>
                  <p className="text-zinc-300 text-sm">{lead.source}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Sector</p>
                  <p className="text-zinc-300 text-sm">{lead.sector}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Last Activity</p>
                  <p className="text-zinc-300 text-sm">{lead.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Modal */}
      <DashboardModal
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={`${selectedLead?.company ?? ''} — Lead Profile`}
      >
        {selectedLead && (
          <>
            <div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="score-dimension">
                <span className="score-dim-label">Sector</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{selectedLead.sector}</span>
              </div>
              <div className="score-dimension">
                <span className="score-dim-label">Score</span>
                <span className="score-dim-val">{selectedLead.score}</span>
              </div>
              <div className="score-dimension">
                <span className="score-dim-label">Source</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{selectedLead.source}</span>
              </div>
              <div className="score-dimension">
                <span className="score-dim-label">Status</span>
                <StatusBadge status={selectedLead.status} />
              </div>
            </div>

            <div className="score-dim-label" style={{ marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Score Breakdown
            </div>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <ScoreBreakdown dimensions={SCORE_DIMENSIONS} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => setSelectedLead(null)}>
                <Calendar size={15} /> Book Demo
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedLead(null)}>
                Close
              </button>
            </div>
          </>
        )}
      </DashboardModal>
    </>
  );
}
