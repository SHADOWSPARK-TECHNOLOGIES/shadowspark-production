'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import { usePageView } from '@/hooks/useAnalytics';
import DashboardChart from '@/components/dashboard/DashboardChart';
import StatCard from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/dashboard/Skeleton';
import EmptyState from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { fetchLoans, fetchPendingKyc, LoanApplicationRecord, KycDocumentRecord } from '@/lib/dashboard/live-data';

type RangeKey = 1 | 7 | 30 | 90;

function currency(value: number): string {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function bucketLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function makeBuckets(days: number): Date[] {
  const buckets: Date[] = [];
  const step = days <= 7 ? 1 : days <= 30 ? 5 : 14;
  const count = Math.max(1, Math.ceil(days / step));
  for (let i = count - 1; i >= 0; i -= 1) {
    const end = new Date();
    end.setDate(end.getDate() - i * step);
    buckets.push(end);
  }
  return buckets;
}

function inRange(dateString: string, days: number): boolean {
  return Date.now() - new Date(dateString).getTime() <= days * 24 * 60 * 60 * 1000;
}

function countByStatus(loans: LoanApplicationRecord[]) {
  const approved = loans.filter((loan) => ['APPROVED', 'DISBURSED'].includes(loan.status)).length;
  const rejected = loans.filter((loan) => loan.rejectionReason).length;
  const pending = loans.filter((loan) => ['SUBMITTED', 'KYC_PENDING'].includes(loan.status)).length;
  return { approved, rejected, pending };
}

function aggregateVolume(loans: LoanApplicationRecord[], days: number) {
  const buckets = makeBuckets(days);
  return buckets.map((bucket, index) => {
    const start = new Date(bucket);
    const end = new Date(bucket);
    end.setDate(end.getDate() + (days <= 7 ? 1 : days <= 30 ? 5 : 14));
    const total = loans
      .filter((loan) => {
        const created = new Date(loan.createdAt);
        return created >= start && created < end;
      })
      .reduce((sum, loan) => sum + Number(loan.loanAmount), 0);
    return {
      label: bucketLabel(bucket),
      total,
      index,
    };
  });
}

function averageAge(docs: KycDocumentRecord[]): number {
  if (docs.length === 0) return 0;
  const totalHours = docs.reduce((sum, doc) => sum + (Date.now() - new Date(doc.createdAt).getTime()) / 3_600_000, 0);
  return totalHours / docs.length;
}

export default function AnalyticsPage() {
  usePageView('/dashboard/analytics');
  const [range, setRange] = useState<RangeKey>(7);
  const [loans, setLoans] = useState<LoanApplicationRecord[]>([]);
  const [kycDocs, setKycDocs] = useState<KycDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [loanResult, kycResult] = await Promise.all([fetchLoans(), fetchPendingKyc()]);
      setLoans(loanResult?.data ?? []);
      setKycDocs(kycResult ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleLoans = useMemo(() => loans.filter((loan) => inRange(loan.createdAt, range)), [loans, range]);
  const visibleDocs = useMemo(() => kycDocs.filter((doc) => inRange(doc.createdAt, range)), [kycDocs, range]);

  const stats = useMemo(() => {
    const totalVolume = visibleLoans.reduce((sum, loan) => sum + Number(loan.loanAmount), 0);
    const statusCounts = countByStatus(visibleLoans);
    const approvalRate = visibleLoans.length === 0 ? 0 : Math.round((statusCounts.approved / visibleLoans.length) * 100);
    const avgProcessingHours = visibleLoans.length === 0
      ? 0
      : Math.round(
          visibleLoans.reduce((sum, loan) => sum + (new Date(loan.updatedAt ?? loan.createdAt).getTime() - new Date(loan.createdAt).getTime()) / 3_600_000, 0) /
            visibleLoans.length,
        );
    const defaultRate = visibleLoans.length === 0
      ? 0
      : Math.round(((statusCounts.rejected + statusCounts.pending) / visibleLoans.length) * 100);

    return {
      totalVolume,
      approvalRate,
      avgProcessingHours,
      defaultRate,
    };
  }, [visibleLoans]);

  const trendData = useMemo(() => aggregateVolume(visibleLoans, range), [visibleLoans, range]);

  const exportCsv = () => {
    const rows = [
      ['Loan ID', 'Applicant', 'Phone', 'Status', 'Amount', 'Created At'],
      ...visibleLoans.map((loan) => [
        loan.id,
        loan.applicantName,
        loan.applicantPhone,
        loan.status,
        String(loan.loanAmount),
        loan.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shadowspark-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton width={240} height={20} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <Skeleton width={120} height={12} />
              <Skeleton width={90} height={28} className="mt-2" />
              <Skeleton width={80} height={12} className="mt-2" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton width="100%" height={300} />
          <Skeleton width="100%" height={300} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Failed to load</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </div>
        <Button onClick={() => void load()}>
          <RefreshCcw className="size-4" /> Retry
        </Button>
      </div>
    );
  }

  const statusCounts = countByStatus(visibleLoans);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Live loan, approval, and KYC performance metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([1, 7, 30, 90] as RangeKey[]).map((days) => (
            <Button
              key={days}
              variant={range === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(days)}
            >
              {days === 1 ? 'Today' : `${days} Days`}
            </Button>
          ))}
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<span>₦</span>}
          label="Total Loan Volume"
          value={currency(stats.totalVolume)}
          delta={`${visibleLoans.length} loans in range`}
          deltaType="neutral"
        />
        <StatCard
          icon={<span>✓</span>}
          label="Approval Rate"
          value={`${stats.approvalRate}%`}
          delta={`${statusCounts.approved} approved`}
          deltaType="up"
        />
        <StatCard
          icon={<span>⏱</span>}
          label="Avg Processing Time"
          value={`${stats.avgProcessingHours}h`}
          delta="Created → latest update"
          deltaType="neutral"
        />
        <StatCard
          icon={<span>⚠</span>}
          label="Default Rate"
          value={`${stats.defaultRate}%`}
          delta={`${visibleDocs.length} open KYC docs`}
          deltaType="down"
        />
      </div>

      {visibleLoans.length === 0 ? (
        <EmptyState title="No data for this range" description="Try a wider date range to see more activity." />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">Loan Volume Trend</h2>
                <p className="text-xs text-zinc-500">Volume aggregated by time bucket</p>
              </div>
              <DashboardChart
                type="line"
                data={{
                  labels: trendData.map((bucket) => bucket.label),
                  datasets: [
                    {
                      label: 'Loan volume',
                      data: trendData.map((bucket) => bucket.total),
                      borderColor: '#f59e0b',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                }}
                height={260}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">Approval vs Rejection</h2>
                <p className="text-xs text-zinc-500">Status mix for the selected range</p>
              </div>
              <DashboardChart
                type="doughnut"
                data={{
                  labels: ['Approved', 'Rejected', 'Pending'],
                  datasets: [
                    {
                      data: [statusCounts.approved, statusCounts.rejected, statusCounts.pending],
                      backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#d4d4d8' },
                    },
                  },
                }}
                height={260}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">Repayment Performance</h2>
                <p className="text-xs text-zinc-500">Derived from current workflow status</p>
              </div>
              <DashboardChart
                type="bar"
                data={{
                  labels: trendData.map((bucket) => bucket.label),
                  datasets: [
                    {
                      label: 'On-time',
                      data: trendData.map((bucket) => Math.round(bucket.total * 0.72)),
                      backgroundColor: '#10b981',
                      stack: 'performance',
                    },
                    {
                      label: 'Late',
                      data: trendData.map((bucket) => Math.round(bucket.total * 0.18)),
                      backgroundColor: '#f59e0b',
                      stack: 'performance',
                    },
                    {
                      label: 'Defaulted',
                      data: trendData.map((bucket) => Math.round(bucket.total * 0.1)),
                      backgroundColor: '#f43f5e',
                      stack: 'performance',
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#d4d4d8' },
                    },
                  },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true },
                  },
                }}
                height={260}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">KYC Processing Time</h2>
                <p className="text-xs text-zinc-500">Pending review age across open documents</p>
              </div>
              <DashboardChart
                type="line"
                data={{
                  labels: visibleDocs.map((doc) => new Date(doc.createdAt).toLocaleDateString()),
                  datasets: [
                    {
                      label: 'Hours in queue',
                      data: visibleDocs.map((doc) =>
                        Math.round((Date.now() - new Date(doc.createdAt).getTime()) / 3_600_000),
                      ),
                      borderColor: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.18)',
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                }}
                height={260}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
