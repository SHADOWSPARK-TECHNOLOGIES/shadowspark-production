'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function WatchtowerLoading() {
  return (
    <>
      <div>
        <Skeleton width={200} height={22} />
        <Skeleton width={280} height={12} className="mt-1" />
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <Skeleton width={100} height={12} />
            <Skeleton width={80} height={28} className="mt-1" />
            <Skeleton width={60} height={12} className="mt-1" />
          </div>
        ))}
      </div>

      {/* Briefing Card */}
      <div className="briefing-card">
        <div className="briefing-header">
          <Skeleton width={160} height={16} />
          <Skeleton width={100} height={12} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="briefing-item">
              <Skeleton width={4} height={36} rounded={false} />
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="70%" height={12} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity feeds */}
      <div className="grid-2">
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                <Skeleton width={8} height={8} rounded />
                <div style={{ flex: 1 }}>
                  <Skeleton width="75%" height={12} />
                  <Skeleton width={60} height={10} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={120} height={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                <Skeleton width={8} height={8} rounded />
                <div style={{ flex: 1 }}>
                  <Skeleton width="65%" height={12} />
                  <Skeleton width={60} height={10} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
