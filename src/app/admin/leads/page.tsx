import { getLeads } from '@/lib/lead-service';
import LeadTable from '@/components/admin/LeadTable';
import { auth } from "@/auth";
import { redirect } from 'next/navigation';

export default async function AdminLeadsPage() {
  const session = await auth();
  
  const userRole = (session?.user as any)?.role?.toLowerCase();
  if (!session || userRole !== 'admin') {
    redirect('/login');
  }

  const leads = await getLeads();

  return (
    <div className="min-h-screen bg-[#050505] p-8 sm:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            ShadowSpark Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Lead Management Pipeline</h1>
          <p className="mt-2 text-zinc-400">
            Review incoming leads, update statuses, and trigger manual demo escrow provisioning.
          </p>
        </div>

        <LeadTable initialLeads={leads} />
      </div>
    </div>
  );
}
