'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function WhatsAppLoading() {
  return (
    <>
      <div>
        <Skeleton width={160} height={22} />
        <Skeleton width={240} height={12} className="mt-1" />
      </div>

      <div className="grid-2">
        {/* Chat area skeleton */}
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
            <Skeleton width={80} height={20} rounded />
          </div>
          <div className="chat-area">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  maxWidth: '75%',
                  alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <Skeleton
                  width={i % 2 === 0 ? 220 : 160}
                  height={36}
                  className={i % 2 === 0 ? '' : ''}
                  rounded
                />
                <Skeleton width={50} height={10} className="mt-1" />
              </div>
            ))}
          </div>
          <div className="chat-input-row" style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton width="100%" height={36} rounded />
            <Skeleton width={80} height={36} rounded />
          </div>
        </div>

        {/* Thread list + metrics */}
        <div>
          <div className="dashboard-card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header">
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={12} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                  <Skeleton width={32} height={32} rounded />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="80%" height={12} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header" style={{ marginBottom: 'var(--space-3)' }}>
              <Skeleton width={140} height={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton width="60%" height={12} />
                  <Skeleton width="100%" height={6} rounded className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
