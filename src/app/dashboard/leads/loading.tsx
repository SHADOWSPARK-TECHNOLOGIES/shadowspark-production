'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function LeadsLoading() {
  return (
    <>
      <div className="card-header">
        <div>
          <Skeleton width={100} height={20} />
          <Skeleton width={180} height={12} className="mt-1" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Skeleton width={200} height={36} rounded />
          <Skeleton width={120} height={36} rounded />
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                {['Company', 'Sector', 'Source', 'Status', 'Score', 'Date', 'Action'].map((h) => (
                  <th key={h}>
                    <Skeleton width={60} height={12} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width={100} height={14} /></td>
                  <td><Skeleton width={80} height={14} /></td>
                  <td><Skeleton width={70} height={14} /></td>
                  <td><Skeleton width={60} height={14} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Skeleton width={100} height={6} rounded />
                      <Skeleton width={24} height={14} />
                    </div>
                  </td>
                  <td><Skeleton width={70} height={14} /></td>
                  <td><Skeleton width={50} height={24} rounded /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
