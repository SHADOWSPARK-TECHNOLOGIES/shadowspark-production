'use client';

import KpiGrid from '@/components/dashboard/KpiGrid';
import type { KpiCardProps } from '@/components/dashboard/KpiCard';
import DashboardChart from '@/components/dashboard/DashboardChart';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { KPI_CARDS, WATCHTOWER_ALERTS, ACTIVITY_EVENTS } from '@/lib/dashboard/data';

const ICON_MAP: Record<string, string> = {
  'Total Leads': '\u{1F465}',
  'Hot Leads': '\u{1F525}',
  'MRR (USD)': '\u{1F4B0}',
  'Compliance Score': '\u{1F6E1}\uFE0F',
  'WhatsApp Sessions': '\u{1F4AC}',
  'Demos Booked': '\u{1F4CA}',
};

export default function DashboardPage() {
  const kpiItems: KpiCardProps[] = KPI_CARDS.map((k) => ({
    icon: <span>{ICON_MAP[k.label] ?? '\u{1F4CA}'}</span>,
    label: k.label,
    value: k.value,
    delta: k.delta,
    deltaType: k.deltaType,
  }));

  return (
    <div className="dashboard-content-inner">
      {/* KPI Grid */}
      <KpiGrid items={kpiItems} />

      {/* Charts section */}
      <div className="grid-2-1">
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Lead Acquisition</h3>
            <span className="card-sub">Last 5 weeks</span>
          </div>
          <DashboardChart
            type="line"
            data={{
              labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'],
              datasets: [{
                label: 'New Leads',
                data: [18, 24, 31, 27, 42],
                borderColor: '#00f2ff',
                backgroundColor: 'rgba(0, 242, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00f2ff',
              }],
            }}
            height={200}
          />
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Revenue Funnel</h3>
            <span className="card-sub">Current pipeline</span>
          </div>
          <DashboardChart
            type="bar"
            data={{
              labels: ['Awareness', 'Lead', 'Qualified', 'Demo', 'Closed'],
              datasets: [{
                label: 'Prospects',
                data: [147, 89, 42, 18, 3],
                backgroundColor: [
                  'rgba(0, 242, 255, 0.6)',
                  'rgba(0, 242, 255, 0.5)',
                  'rgba(0, 242, 255, 0.4)',
                  'rgba(0, 242, 255, 0.3)',
                  'rgba(0, 242, 255, 0.2)',
                ],
                borderColor: '#00f2ff',
                borderWidth: 1,
                borderRadius: 4,
              }],
            }}
            options={{
              indexAxis: 'y',
              scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } },
              },
            }}
            height={200}
          />
        </div>
      </div>

      {/* Activity feeds */}
      <div className="grid-2">
        <ActivityFeed
          title="Watchtower Alerts"
          items={WATCHTOWER_ALERTS.map((a) => ({
            dotColor: a.dotColor,
            text: a.text,
            time: a.time,
          }))}
        />
        <ActivityFeed
          title="Live Activity"
          items={ACTIVITY_EVENTS.map((e) => ({
            dotColor: e.dotColor,
            text: e.text,
            time: e.time,
          }))}
        />
      </div>
    </div>
  );
}
