'use client';

import { useState } from 'react';
import { SCORE_DIMS, LEADS } from '@/lib/dashboard/data';
import ProgressBar from '@/components/dashboard/ProgressBar';

export default function ScoringPage() {
  const [dims, setDims] = useState([...SCORE_DIMS]);

  const updateDim = (i: number, val: number) => {
    const next = [...dims];
    next[i] = { ...next[i], val };
    setDims(next);
  };

  const composite = Math.round(dims.reduce((a, d) => a + d.val, 0) / dims.length);
  const tier = composite >= 80 ? 'Hot Lead' : composite >= 60 ? 'Warm Lead' : 'Cold Lead';

  return (
    <>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Lead Scoring Engine
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          Adjust weights · real-time score calculation
        </p>
      </div>

      <div className="grid-1-2">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Score Dimensions</div>
            <div className="card-sub">Drag sliders to adjust weights</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {dims.map((d, i) => (
              <div key={d.key} className="score-dimension">
                <div className="score-dim-header">
                  <span className="score-dim-label">{d.label}</span>
                  <span className="score-dim-val">{d.val}</span>
                </div>
                <input
                  type="range"
                  className="score-slider"
                  min={0}
                  max={100}
                  value={d.val}
                  onChange={(e) => updateDim(i, parseInt(e.target.value))}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 'var(--space-5)',
              padding: 'var(--space-4)',
              background: 'var(--color-primary-highlight)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}
            >
              COMPOSITE SCORE
            </div>
            <div className="ring-val" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {composite}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              out of 100 · <span>{tier}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Top Leads by Score</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[...LEADS]
              .sort((a, b) => b.score - a.score)
              .map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    background: 'var(--color-surface-offset)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{l.company}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{l.sector}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <ProgressBar value={l.score} color="#00f2ff" />
                    <span className="score-num">{l.score}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
