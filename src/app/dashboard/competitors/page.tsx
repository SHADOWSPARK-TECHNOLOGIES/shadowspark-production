'use client';

import DashboardChart from '@/components/dashboard/DashboardChart';
import Badge from '@/components/dashboard/Badge';
import { getChartTheme } from '@/lib/dashboard/chart-theme';

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
                    pointRadius: 4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Industry Avg',
                    data: [42, 55, 50, 60, 48, 35],
                    borderColor: theme.textColor,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: theme.textColor,
                    pointRadius: 3,
                    borderWidth: 1.5,
                    borderDash: [4, 3] as number[],
                  },
                ],
              }}
              options={{
                scales: {
                  r: {
                    grid: { display: true },
                    ticks: { display: false },
                    pointLabels: { font: { size: 11 } },
                    min: 0,
                    max: 100,
                  },
                },
              }}
              height={280}
            />
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Competitor Matrix</div>
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
                    <td>
                      <strong>{row.company}</strong>
                    </td>
                    <td>{row.focus}</td>
                    <td>
                      <Badge variant={row.complianceVariant}>{row.compliance}</Badge>
                    </td>
                    <td>
                      <Badge variant={row.whatsappVariant}>{row.whatsapp}</Badge>
                    </td>
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
