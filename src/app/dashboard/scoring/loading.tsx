'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function ScoringLoading() {
  return (
    <>
      <div>
        <Skeleton width={180} height={22} />
        <Skeleton width={220} height={12} className="mt-1" />
      </div>

      <div className="grid-2">
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="score-dimension">
                <div className="score-dim-header">
                  <Skeleton width={100} height={14} />
                  <Skeleton width={30} height={14} />
                </div>
                <Skeleton width="100%" height={6} rounded />
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={120} height={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                <Skeleton width={8} height={8} rounded />
                <div style={{ flex: 1 }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={12} className="mt-1" />
                </div>
                <Skeleton width={40} height={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
