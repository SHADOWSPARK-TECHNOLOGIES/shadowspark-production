'use client';

import { useState } from 'react';
import { setLeadStatusAction } from './actions';
import type { Lead } from '@/generated/prisma/client/client';

export function LeadList({ initialLeads }: { initialLeads: Lead[] }) {
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const filteredLeads = initialLeads.filter(
    (lead) => filter === 'all' || lead.status === filter
  );

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    const result = await setLeadStatusAction(id, newStatus);
    if (!result.success) {
      alert('Failed to update status');
    }
    setUpdating(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">All Leads</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="demo_scheduled">Demo Scheduled</option>
          <option value="converted">Converted</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#050505]">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Demo Scheduled</th>
              <th className="px-6 py-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-zinc-900/50">
                  <td className="px-6 py-4 font-medium text-white">{lead.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      disabled={updating === lead.id}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="demo_scheduled">Demo Scheduled</option>
                      <option value="converted">Converted</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {lead.demoScheduled ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
