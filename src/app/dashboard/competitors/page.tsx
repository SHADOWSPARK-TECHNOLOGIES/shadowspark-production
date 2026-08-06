'use client';

export const dynamic = 'force-dynamic';

import NextDynamic from 'next/dynamic';
import Badge from '@/components/dashboard/Badge';
import { getChartTheme } from '@/lib/dashboard/chart-theme';

const DashboardChart = NextDynamic(
  () => import('@/components/dashboard/DashboardChart'),
  { ssr: false }
);

const COMPETITOR_MATRIX = [
  { company: 'ShadowSpark', focus: 'B2B AI Full-Stack', compliance: '✓ ISA 2025', complianceVariant: 'green' as const, whatsapp: 'Native', whatsappVariant: 'green' as const, pricing: '$149–$599' },
  { company: 'Helium Health', focus: 'HealthTech SaaS', compliance: 'Partial', complianceVariant: 'muted' as const, whatsapp: 'None', whatsappVariant: 'muted' as const, pricing: 'Custom' },
  { company: 'Flutterwave', focus: 'Payments', compliance: 'CBN only', complianceVariant: 'orange' as const, whatsapp: 'Limited', whatsappVariant: 'muted' as const, pricing: 'Per-txn' },
  { company: 'Duplo', focus: 'B2B Payments', compliance: 'Basic', complianceVariant: 'muted' as const, whatsapp: 'None', whatsappVariant: 'muted' as const, pricing: 'Custom' },
  { company: 'Mono', focus: 'Open Finance', compliance: 'CBN focus', complianceVariant: 'orange' as const, whatsapp: 'None', whatsappVariant: 'muted' as const, pricing: 'API pay' },
];

const RADAR_LABELS = ['WhatsApp AI', 'Compliance', 'Automation', 'Pricing', 'Local Support', 'RAG Intelligence'];

export default function CompetitorsPage() {
  const theme = getChartTheme();

  return (
    <>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Competitor Intel
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          Nigerian B2B AI automation market · May 2026
        </p>
      </div>

      <div className="grid-2">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Capability Radar</div>
            <div className="card-sub">ShadowSpark vs industry average</div>
          </div>
          <div style={{ position: 'relative', height: 280 }}>
            <DashboardChart
              type="radar"
              data={{
                labels: RADAR_LABELS,
                datasets: [
                  {
                    label: 'ShadowSpark',
                    data: [95, 88, 82, 85, 92, 90],
                    borderColor: theme.primary,
                    backgroundColor: theme.bg,
                    pointBackgroundColor: theme.primary,
                    pointBorderColor: theme.primary,
                  },
                  {
                    label: 'Industry Avg',
                    data: [65, 55, 50, 60, 45, 40],
                    borderColor: theme.gridColor,
                    backgroundColor: 'transparent',
                    borderDash: [4, 4],
                    pointBackgroundColor: theme.gridColor,
                    pointBorderColor: theme.gridColor,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: theme.textColor, font: { size: 11 } } },
                },
                scales: {
                  r: {
                    angleLines: { color: theme.gridColor },
                    grid: { color: theme.gridColor },
                    pointLabels: { color: theme.textColor, font: { size: 10 } },
                    ticks: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Competitor Matrix</div>
            <div className="card-sub">Feature comparison</div>
          </div>
          <div className="table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Focus</th>
                  <th>Compliance</th>
                  <th>WhatsApp</th>
                  <th>Pricing</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITOR_MATRIX.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.company}</td>
                    <td>{row.focus}</td>
                    <td><Badge variant={row.complianceVariant}>{row.compliance}</Badge></td>
                    <td><Badge variant={row.whatsappVariant}>{row.whatsapp}</Badge></td>
                    <td>{row.pricing}</td>
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
