'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function SettingsLoading() {
  return (
    <>
      <div>
        <Skeleton width={140} height={22} />
        <Skeleton width={200} height={12} className="mt-1" />
      </div>

      {/* Settings sections */}
      {['Regulatory Scans', 'Webhook Configuration', 'Infrastructure', 'Team'].map((section) => (
        <div key={section} className="settings-section">
          <Skeleton width={160} height={16} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: section === 'Webhook Configuration' ? 3 : section === 'Infrastructure' ? 4 : 2 }).map((_, i) => (
              <div key={i} className="settings-row">
                <div>
                  <Skeleton width={120} height={14} />
                  <Skeleton width={80} height={10} className="mt-1" />
                </div>
                <Skeleton width="100%" height={32} rounded />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
