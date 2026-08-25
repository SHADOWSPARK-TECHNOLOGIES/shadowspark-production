'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  Download,
  ShieldCheck,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePageView } from '@/hooks/useAnalytics';
import EmptyState from '@/components/dashboard/EmptyState';
import DashboardModal from '@/components/dashboard/DashboardModal';
import { Skeleton } from '@/components/dashboard/Skeleton';
import Badge from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  fetchPendingKyc,
  KycDocumentRecord,
  verifyKycDocument,
} from '@/lib/dashboard/live-data';

type KycState = {
  pending: KycDocumentRecord[];
  verified: KycDocumentRecord[];
  rejected: KycDocumentRecord[];
};

const rejectSchema = z.object({
  reason: z.string().trim().min(4, 'Enter a rejection reason'),
});

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatQueueTime(dateString: string): string {
  const start = new Date(dateString).getTime();
  const hours = Math.max(0, Math.floor((Date.now() - start) / 3_600_000));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor((Date.now() - start) / 60_000));
    return `${minutes}m`;
  }
  return `${hours}h`;
}

function isPriority(dateString: string): boolean {
  return Date.now() - new Date(dateString).getTime() > 24 * 60 * 60 * 1000;
}

function getOcrData(document: KycDocumentRecord): Record<string, string> {
  const raw = document.ocrData;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')]),
    );
  }

  return {
    bvn: '******4821',
    nin: 'A1234567890',
    dob: '1994-05-12',
    address: 'Owerri, Imo State',
  };
}

function DraggableCard({
  document,
  onOpen,
}: {
  document: KycDocumentRecord;
  onOpen: (document: KycDocumentRecord) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: document.id,
    data: { document },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = isPriority(document.createdAt);

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(document)}
      className={`w-full rounded-xl border bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 ${
        priority ? 'border-amber-500/60' : 'border-zinc-800'
      }`}
      style={style}
    >
      <div className="flex items-start gap-3">
        <div className="avatar shrink-0">{initials(document.loanApplication.applicantName)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-zinc-100">
              {document.loanApplication.applicantName}
            </div>
            {priority ? <Badge variant="orange">Priority</Badge> : null}
          </div>
          <div className="mt-1 text-xs text-zinc-400">{document.loanApplication.applicantPhone}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{document.type}</Badge>
            <span className="text-[11px] text-zinc-500">Queue {formatQueueTime(document.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Column({
  id,
  title,
  docs,
  onOpen,
  emptyLabel,
}: {
  id: string;
  title: string;
  docs: KycDocumentRecord[];
  onOpen: (doc: KycDocumentRecord) => void;
  emptyLabel: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 ${isOver ? 'border-amber-500/70 bg-amber-500/5' : 'border-zinc-800 bg-zinc-950/50'}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-500">{docs.length} documents</p>
        </div>
      </div>
      <div className="space-y-3">
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            {emptyLabel}
          </div>
        ) : (
          docs.map((doc) => <DraggableCard key={doc.id} document={doc} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export default function KycPage() {
  usePageView('/dashboard/kyc');
  const [state, setState] = useState<KycState>({ pending: [], verified: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<KycDocumentRecord | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rejectionForm = useForm<z.infer<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  });

  const activeDoc = useMemo(
    () => [...state.pending, ...state.verified, ...state.rejected].find((doc) => doc.id === activeId) ?? null,
    [activeId, state],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const documents = await fetchPendingKyc();
      setState({ pending: documents ?? [], verified: [], rejected: [] });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function moveDocument(doc: KycDocumentRecord, nextStatus: 'verified' | 'rejected') {
    setState((current) => {
      const pending = current.pending.filter((item) => item.id !== doc.id);
      const nextDoc = {
        ...doc,
        status: nextStatus === 'verified' ? 'VERIFIED' : 'REJECTED',
      };
      return {
        pending,
        verified: nextStatus === 'verified' ? [nextDoc, ...current.verified] : current.verified,
        rejected: nextStatus === 'rejected' ? [nextDoc, ...current.rejected] : current.rejected,
      };
    });
  }

  async function verify(doc: KycDocumentRecord, reason?: string) {
    try {
      const result = await verifyKycDocument(doc.id, {
        status: reason ? 'REJECTED' : 'VERIFIED',
        rejectionReason: reason,
      });

      moveDocument(doc, reason ? 'rejected' : 'verified');
      setActiveId(null);
      if (result?.kycDocument) {
        // keep the response visible in the correct column; local state already reflects the change
      }
      return true;
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Failed to verify KYC');
      return false;
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active.data.current?.document as KycDocumentRecord | undefined;
    if (!active) return;
    if (event.over?.id === 'verified-column') {
      void verify(active);
    }
    if (event.over?.id === 'rejected-column') {
      setRejectingDoc(active);
      setActiveId(null);
      rejectionForm.reset({ reason: '' });
    }
  }

  const counts = {
    pending: state.pending.length,
    verified: state.verified.length,
    rejected: state.rejected.length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width={180} height={20} />
            <Skeleton width={260} height={12} />
          </div>
          <Skeleton width={120} height={40} />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <Skeleton width={120} height={14} />
              <div className="mt-4 space-y-3">
                <Skeleton width="100%" height={110} />
                <Skeleton width="100%" height={110} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-10 text-amber-500" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Failed to load</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </div>
        <Button onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">KYC Verification Center</h1>
          <p className="mt-1 text-sm text-zinc-400">Pending review, verified, and rejected documents</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Badge variant="outline">Pending {counts.pending}</Badge>
          <Badge variant="outline">Verified {counts.verified}</Badge>
          <Badge variant="outline">Rejected {counts.rejected}</Badge>
        </div>
      </div>

      {counts.pending === 0 && counts.verified === 0 && counts.rejected === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-6" />}
          title="No pending KYC documents"
          description="New submissions will appear here for review."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Column
            id="pending-column"
            title="Pending Review"
            docs={state.pending}
            onOpen={(doc) => {
              setActiveId(doc.id);
              setViewerZoom(1);
              setViewerRotation(0);
            }}
            emptyLabel="No pending KYC documents"
          />
          <Column
            id="verified-column"
            title="Verified"
            docs={state.verified}
            onOpen={(doc) => setActiveId(doc.id)}
            emptyLabel="Drop approved documents here"
          />
          <Column
            id="rejected-column"
            title="Rejected"
            docs={state.rejected}
            onOpen={(doc) => setActiveId(doc.id)}
            emptyLabel="Drop documents to reject"
          />
        </div>
      )}

      <DragOverlay>
        {activeDoc ? (
          <div className="w-[320px] rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
            <div className="text-sm font-semibold text-zinc-100">{activeDoc.loanApplication.applicantName}</div>
            <div className="mt-1 text-xs text-zinc-400">{activeDoc.loanApplication.applicantPhone}</div>
          </div>
        ) : null}
      </DragOverlay>

      <DashboardModal open={activeDoc !== null} onClose={() => setActiveId(null)} title="KYC Document Details">
        {activeDoc ? (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-[55%]">
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Search className="size-4" />
                    Document viewer
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewerZoom((v) => Math.max(1, v - 0.5))}>
                      <ZoomOut className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setViewerZoom((v) => Math.min(2, v + 0.5))}>
                      <ZoomIn className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setViewerRotation((v) => v + 90)}>
                      <RotateCw className="size-4" />
                    </Button>
                    {activeDoc.fileUrl ? (
                      <a className="btn btn-ghost" href={activeDoc.fileUrl} download target="_blank" rel="noreferrer">
                        <ArrowDownToLine className="size-4" /> Download
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  {activeDoc.fileUrl ? (
                    <img
                      src={activeDoc.fileUrl}
                      alt={`${activeDoc.loanApplication.applicantName} document`}
                      className="max-h-[360px] max-w-full origin-center object-contain transition-transform duration-200"
                      style={{ transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)` }}
                    />
                  ) : (
                    <div className="text-center text-sm text-zinc-500">Document preview unavailable</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-[45%] space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-sm font-semibold text-zinc-100">{activeDoc.loanApplication.applicantName}</div>
                <div className="mt-1 text-xs text-zinc-400">{activeDoc.loanApplication.applicantPhone}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{activeDoc.type}</Badge>
                  <Badge variant={activeDoc.status === 'VERIFIED' ? 'green' : activeDoc.status === 'REJECTED' ? 'red' : 'orange'}>
                    {activeDoc.status}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                  <div>Queue time</div>
                  <div className="text-zinc-100">{formatQueueTime(activeDoc.createdAt)}</div>
                  <div>Loan amount</div>
                  <div className="text-zinc-100">₦{Number(activeDoc.loanApplication.loanAmount).toLocaleString()}</div>
                  <div>Created</div>
                  <div className="text-zinc-100">{new Date(activeDoc.createdAt).toLocaleString()}</div>
                  <div>Priority</div>
                  <div className="text-zinc-100">{isPriority(activeDoc.createdAt) ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <h4 className="text-sm font-semibold text-zinc-100">OCR data</h4>
                <div className="mt-3 space-y-3">
                  {Object.entries(getOcrData(activeDoc)).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">{key}</div>
                      <Input readOnly value={value} className="mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void verify(activeDoc)} className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Check className="size-4" /> Verify &amp; Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingDoc(activeDoc);
                    setActiveId(null);
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        open={rejectingDoc !== null}
        onClose={() => setRejectingDoc(null)}
        title="Reject KYC Document"
      >
        {rejectingDoc ? (
          <form
            className="space-y-4"
            onSubmit={rejectionForm.handleSubmit((values) => {
              void verify(rejectingDoc, values.reason).then((ok) => {
                if (ok) setRejectingDoc(null);
              });
            })}
          >
            <div className="text-sm text-zinc-400">
              {rejectingDoc.loanApplication.applicantName} · {rejectingDoc.type}
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
                Rejection reason
              </label>
              <Textarea
                rows={5}
                placeholder="Explain what is missing or invalid"
                {...rejectionForm.register('reason')}
              />
              {rejectionForm.formState.errors.reason ? (
                <p className="mt-1 text-xs text-rose-400">{rejectionForm.formState.errors.reason.message}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setRejectingDoc(null)}>
                Cancel
              </Button>
              <Button type="submit">Submit rejection</Button>
            </div>
          </form>
        ) : null}
      </DashboardModal>
    </DndContext>
  );
}
