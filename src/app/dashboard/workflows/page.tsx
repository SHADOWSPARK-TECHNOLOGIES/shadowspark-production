'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus, Play, Pencil, Trash2, Workflow } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { usePageView } from '@/hooks/useAnalytics';
import DataTable from '@/components/dashboard/DataTable';
import Badge from '@/components/dashboard/Badge';
import ProgressBar from '@/components/dashboard/ProgressBar';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';

type WorkflowRow = {
  id: string;
  name: string;
  triggerType: string;
  status: 'draft' | 'active' | 'paused';
  lastRun: string;
  successRate: number;
  runs: number;
};

const DEMO_WORKFLOWS: WorkflowRow[] = [
  {
    id: 'onboarding-kyc',
    name: 'Loan onboarding',
    triggerType: 'Loan submitted',
    status: 'active',
    lastRun: 'Today · 08:42',
    successRate: 94,
    runs: 128,
  },
  {
    id: 'kyc-reminder',
    name: 'KYC reminder',
    triggerType: '24h pending',
    status: 'paused',
    lastRun: 'Yesterday · 17:10',
    successRate: 78,
    runs: 46,
  },
  {
    id: 'repayment-nudge',
    name: 'Repayment nudge',
    triggerType: 'Due date reached',
    status: 'active',
    lastRun: 'Today · 07:00',
    successRate: 89,
    runs: 221,
  },
  {
    id: 'legal-escalation',
    name: 'Legal escalation',
    triggerType: '3 missed payments',
    status: 'draft',
    lastRun: '—',
    successRate: 0,
    runs: 0,
  },
];

function successLabel(rate: number): string {
  return `${rate}%`;
}

export default function WorkflowsPage() {
  usePageView('/dashboard/workflows');
  const [rows, setRows] = useState(DEMO_WORKFLOWS);

  const columns = useMemo<ColumnDef<WorkflowRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-zinc-100">{row.original.name}</div>
            <div className="text-xs text-zinc-500">{row.original.runs} runs</div>
          </div>
        ),
      },
      {
        accessorKey: 'triggerType',
        header: 'Trigger type',
        cell: ({ row }) => <Badge variant="outline">{row.original.triggerType}</Badge>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'lastRun',
        header: 'Last Run',
        cell: ({ row }) => <span className="text-sm text-zinc-300">{row.original.lastRun}</span>,
      },
      {
        accessorKey: 'successRate',
        header: 'Success Rate',
        cell: ({ row }) => (
          <div className="space-y-2">
            <ProgressBar value={row.original.successRate} color="var(--color-success)" />
            <div className="text-xs text-zinc-500">{successLabel(row.original.successRate)}</div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/workflows/${row.original.id}/builder`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.original.id
                      ? { ...item, lastRun: 'Just now', status: 'active', successRate: Math.min(99, item.successRate + 1) }
                      : item,
                  ),
                );
              }}
            >
              <Play className="size-4" /> Run Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.original.id))}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Workflows</h1>
          <p className="mt-1 text-sm text-zinc-400">Build and run automation across the loan lifecycle</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workflows/demo/builder">
            <Plus className="size-4" /> Create Workflow
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <DataTable
          columns={columns}
          data={rows}
          pageSize={10}
          emptyTitle="No workflows"
          emptyDescription="Create your first workflow to automate follow-ups."
        />
      </div>
    </div>
  );
}
