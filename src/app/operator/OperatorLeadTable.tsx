"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export type OperatorLead = {
  id: string;
  name: string;
  business: string;
  status: "New" | "Paid" | "Demo Generated" | "Approved" | "Rejected";
  demoSlug: string | null;
  leadScore: number | null;
  reasoning: string | null;
  rootUrl?: string;
  paymentRef?: string | null;
};

function statusClasses(status: OperatorLead["status"]) {
  if (status === "Approved") return "border-green-400/20 bg-green-400/10 text-green-300";
  if (status === "Demo Generated") return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  if (status === "Paid") return "border-sky-400/20 bg-sky-400/10 text-sky-300";
  if (status === "Rejected") return "border-red-400/20 bg-red-400/10 text-red-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function ActionsCell({ row, busyId, updateLead }: { row: any, busyId: string | null, updateLead: (id: string, action: "approve" | "reject") => void }) {
  const [syncing, setSyncing] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [forcing, setForcing] = useState(false);
  const lead = row.original;

  const handleRefreshIntelligence = async (slug: string, rootUrl: string) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/cron/rag-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, rootUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Intelligence sync triggered for ${slug}. Vault updating.`);
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendNudge = async (leadId: string) => {
    setNudging(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/initialize-demo-payment`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to initialize payment');
      }
      const data = await res.json();
      toast.success(`Payment link generated! URL: ${data.authorization_url}`);
    } catch (error: any) {
      toast.error(`Nudge failed: ${error.message}`);
    } finally {
      setNudging(false);
    }
  };

  const handleForceApprove = async (leadId: string) => {
    setForcing(true);
    try {
      const res = await fetch(`/api/operator/force-approve-payment/${leadId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Force approval failed');
      }
      toast.success(`Payment force-approved! Lead converted to PAID.`);
      // Update local row state to reflect the new status
      updateLead(leadId, "approve");
    } catch (error: any) {
      toast.error(`Force approve failed: ${error.message}`);
    } finally {
      setForcing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {lead.demoSlug ? (
        <Link
          href={`/demo/${lead.demoSlug}`}
          className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          View Demo
        </Link>
      ) : null}
      
      {lead.demoSlug && lead.rootUrl ? (
        <button
          onClick={() => handleRefreshIntelligence(lead.demoSlug!, lead.rootUrl!)}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-zinc-950 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all hover:bg-cyan-950/30 disabled:opacity-50"
        >
          {syncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {syncing ? 'SYNCING...' : 'REFRESH INTELLIGENCE'}
        </button>
      ) : null}

      {/* Payment Nudge — visible for Demo Generated leads without paymentRef */}
      {lead.status === "Demo Generated" && !lead.paymentRef ? (
        <button
          type="button"
          disabled={nudging || busyId === lead.id}
          onClick={() => handleSendNudge(lead.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition-all hover:bg-amber-950/40 disabled:opacity-50"
        >
          {nudging ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <span className="text-xs">💳</span>
          )}
          {nudging ? 'NUDGING...' : 'SEND NUDGE'}
        </button>
      ) : null}

      {/* Force Approve — visible for leads with a pending paymentRef (bank transfer screenshot) */}
      {lead.paymentRef && (lead.status === "Demo Generated" || lead.status === "Paid") ? (
        <button
          type="button"
          disabled={forcing || busyId === lead.id}
          onClick={() => handleForceApprove(lead.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 transition-all hover:bg-emerald-950/40 disabled:opacity-50"
        >
          {forcing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          {forcing ? 'APPROVING...' : 'FORCE APPROVE'}
        </button>
      ) : null}

      <button
        type="button"
        disabled={busyId === lead.id}
        onClick={() => updateLead(lead.id, "approve")}
        className="rounded-full bg-cyan-400 px-3 py-2 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={busyId === lead.id}
        onClick={() => updateLead(lead.id, "reject")}
        className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}

export default function OperatorLeadTable({ data }: { data: OperatorLead[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<OperatorLead[]>(data);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateLead(leadId: string, action: "approve" | "reject") {
    setBusyId(leadId);
    try {
      const response = await fetch(`/api/operator/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `${action} failed`);
      }

      setRows((current) =>
        current.map((row) =>
          row.id === leadId
            ? { ...row, status: action === "approve" ? "Approved" : "Rejected" }
            : row
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<ColumnDef<OperatorLead>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "business",
        header: "Business",
      },
      {
        accessorKey: "leadScore",
        header: "Score",
        cell: ({ row }) => {
          const score = row.original.leadScore ?? 0;
          return (
            <div className="relative group inline-flex items-center gap-1 cursor-help">
              <span className={`font-bold px-2 py-1 rounded-md text-xs ${
                score > 85 ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "text-zinc-300"
              }`}>
                {score} {score > 85 && '⚡'}
              </span>
              {row.original.reasoning && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-zinc-800 text-zinc-300 text-[10px] rounded shadow-xl z-50 border border-zinc-700 pointer-events-none">
                  {row.original.reasoning}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses(
              row.original.status
            )}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <ActionsCell row={row} busyId={busyId} updateLead={updateLead} />,
      },
    ],
    [busyId]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      const haystack = `${row.original.name} ${row.original.business} ${row.original.status}`.toLowerCase();
      return haystack.includes(String(value).toLowerCase());
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-zinc-800 bg-zinc-950/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">Lead Command Grid</p>
          <p className="mt-2 text-sm text-zinc-400">Search, sort, and act on active pipeline records.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search leads..."
          className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 md:max-w-xs"
        />
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-zinc-800 bg-zinc-950">
        <Table>
          <TableHeader className="bg-zinc-900/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-zinc-800">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-6 py-4 text-[10px] uppercase tracking-[0.18em] text-zinc-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </tr>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className={`border-b border-zinc-900 transition-colors hover:bg-zinc-900/40 ${
                    (row.original.leadScore ?? 0) > 85
                      ? "animate-pulse border-cyan-500 shadow-[0_0_15px_cyan]"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
              <tr>
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                  No matching leads.
                </TableCell>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
