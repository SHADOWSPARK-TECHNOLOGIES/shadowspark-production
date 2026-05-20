'use client';

import { Skeleton } from '@/components/dashboard/Skeleton';

export default function CompetitorsLoading() {
  return (
    <>
      <div>
        <Skeleton width={180} height={22} />
        <Skeleton width={280} height={12} className="mt-1" />
      </div>

      <div className="grid-2">
        {/* Chart skeleton */}
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={140} height={16} />
            <Skeleton width={120} height={12} />
          </div>
          <Skeleton width="100%" height={280} />
        </div>

        {/* Table skeleton */}
        <div className="dashboard-card">
          <div className="card-header">
            <Skeleton width={160} height={16} />
          </div>
          <div className="table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  {['Company', 'Focus', 'Compliance', 'WhatsApp', 'Pricing'].map((h) => (
                    <th key={h}>
                      <Skeleton width={60} height={12} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width={100} height={14} /></td>
                    <td><Skeleton width={90} height={14} /></td>
                    <td><Skeleton width={70} height={14} /></td>
                    <td><Skeleton width={60} height={14} /></td>
                    <td><Skeleton width={60} height={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
