'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function AuditLoading() {
  return (
    <>
      <div>
        <Skeleton width={160} height={22} />
        <Skeleton width={240} height={12} className="mt-1" />
      </div>

      <div className="grid-2-1">
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
            <Skeleton width={100} height={28} rounded />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="domain-row">
                <div className="domain-row-header">
                  <Skeleton width={120} height={14} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Skeleton width={40} height={14} />
                    <Skeleton width={14} height={14} />
                  </div>
                </div>
                <Skeleton width="100%" height={6} rounded />
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} />
          </div>
          <Skeleton width="100%" height={200} />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <Skeleton width={140} height={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
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
              <Skeleton width={4} height={40} rounded={false} />
              <div style={{ flex: 1 }}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="80%" height={12} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
