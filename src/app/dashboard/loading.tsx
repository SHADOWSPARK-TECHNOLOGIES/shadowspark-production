'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="dashboard-content-inner" aria-label="Loading Command Centre">
      {/* KPI Grid */}
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <Skeleton width={80} height={12} />
            <Skeleton width={120} height={28} className="mt-1" />
            <Skeleton width={60} height={12} className="mt-1" />
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid-2-1">
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
            <Skeleton width={80} height={12} />
          </div>
          <Skeleton width="100%" height={200} />
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} />
          </div>
          <Skeleton width="100%" height={200} />
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
                  <Skeleton width="70%" height={12} />
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
    </div>
  );
}
