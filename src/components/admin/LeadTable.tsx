'use client';

import { useState } from 'react';
import { setLeadStatusAction } from '@/app/admin/leads/actions';
import type { Lead } from '@/generated/prisma/client/client';

export default function LeadTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [modalLead, setModalLead] = useState<Lead | null>(null);

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

  const handleScheduleDemo = (lead: Lead) => {
    setModalLead(lead);
    // In a real flow, this could also update the status to 'demo_scheduled'
    // after the user confirms in the modal.
  };

  return (
    <div className="space-y-6">
      {/* Modal Placeholder */}
      {modalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#050505] p-6 shadow-[0_0_50px_rgba(0,229,255,0.1)]">
            <h3 className="mb-2 text-xl font-bold text-white">Schedule Demo</h3>
            <p className="mb-6 text-sm text-zinc-400">
              Manual demo scheduling for <span className="text-cyan-400">{modalLead.email}</span>.
              <br />
              (Calendar integration placeholder)
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalLead(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleStatusChange(modalLead.id, 'demo_scheduled');
                  setModalLead(null);
                }}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-black hover:bg-cyan-400"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
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
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Metadata Preview</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
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
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="truncate text-xs text-zinc-500 max-w-[150px] inline-block">
                      {lead.metadata ? JSON.stringify(lead.metadata) : 'None'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleScheduleDemo(lead)}
                      disabled={lead.status === 'demo_scheduled'}
                      className="inline-flex items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schedule Demo
                    </button>
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
