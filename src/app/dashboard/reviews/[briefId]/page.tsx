"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  Gauge,
  ServerOff,
  Clock,
  CheckCircle2,
  Copy,
  Send,
  UserCheck,
} from "lucide-react";
import type { ReviewQueueResponse, ReviewAnnotation } from "@/lib/ai-assist/types";
import EmptyState from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/dashboard/Skeleton";
import Badge from "@/components/dashboard/Badge";
import { Button } from "@/components/ui/button";

export type DetailUIState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "success"; data: ReviewQueueResponse }
  | { status: "400"; message: string }
  | { status: "401"; message: string }
  | { status: "403"; message: string }
  | { status: "404"; message: string }
  | { status: "409"; message: string }
  | { status: "429"; message: string }
  | { status: "503"; message: string; statusCode: number };

export default function ReviewDetailPage(props: any) {
  const routeParams = props.params;
  const simulatedState = props.simulatedState;
  const routerParams = useParams();

  // Resolve briefId synchronously from props or useParams
  const directBriefId =
    typeof routeParams === "object" && !(routeParams instanceof Promise)
      ? routeParams.briefId
      : undefined;
  const paramFromRouter = routerParams?.briefId as string | undefined;

  const [asyncBriefId, setAsyncBriefId] = useState<string>("");

  useEffect(() => {
    if (routeParams instanceof Promise) {
      routeParams.then((p) => {
        if (p?.briefId) setAsyncBriefId(p.briefId);
      });
    }
  }, [routeParams]);

  const resolvedBriefId = directBriefId || paramFromRouter || asyncBriefId || "";

  const [uiState, setUiState] = useState<DetailUIState>(
    simulatedState ?? { status: "loading" }
  );
  const currentUiState = simulatedState ?? uiState;

  // Operator annotation form state
  const [annotationInput, setAnnotationInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);



  const fetchBrief = useCallback(async (id: string) => {
    if (!id) return;
    setUiState({ status: "loading" });
    try {
      const res = await fetch(`/api/compliance/reviews/${encodeURIComponent(id)}`);

      if (res.status === 400) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "400",
          message: payload.error?.message || "Invalid brief identifier requested.",
        });
        return;
      }
      if (res.status === 401) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "401",
          message: payload.error?.message || "Authentication required to inspect exception brief.",
        });
        return;
      }
      if (res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "403",
          message:
            payload.error?.message ||
            "Access forbidden: verified tenant membership and authorized compliance role required.",
        });
        return;
      }
      if (res.status === 404) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "404",
          message: payload.error?.message || `Review brief "${id}" not found or belongs to another tenant.`,
        });
        return;
      }
      if (res.status === 409) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "409",
          message: payload.error?.message || "Conflict accessing review brief.",
        });
        return;
      }
      if (res.status === 429) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "429",
          message:
            payload.error?.message ||
            "Rate limit exceeded on compliance inspection service.",
        });
        return;
      }
      if (res.status >= 500) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "503",
          statusCode: res.status,
          message:
            payload.error?.message ||
            `Compliance service temporarily unavailable (upstream status ${res.status}).`,
        });
        return;
      }

      const json = await res.json();
      if (!json.data || !json.data.brief_id) {
        setUiState({ status: "empty" });
      } else {
        setUiState({
          status: "success",
          data: json.data,
        });
      }
    } catch (err: unknown) {
      setUiState({
        status: "503",
        statusCode: 503,
        message:
          err instanceof Error
            ? err.message
            : "Network error contacting compliance review service.",
      });
    }
  }, []);

  useEffect(() => {
    if (!simulatedState && resolvedBriefId) {
      fetchBrief(resolvedBriefId);
    }
  }, [fetchBrief, resolvedBriefId, simulatedState]);


  // Handle operator annotation submission
  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmed = annotationInput.trim();
    if (!trimmed) {
      setFormError("Annotation cannot be empty or whitespace.");
      return;
    }
    if (trimmed.length > 2000) {
      setFormError(`Annotation exceeds 2,000 characters (${trimmed.length} characters entered).`);
      return;
    }

    const briefId = resolvedBriefId || (currentUiState.status === "success" ? currentUiState.data.brief_id : "");
    if (!briefId) {
      setFormError("No active brief ID available for annotation.");
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch(`/api/compliance/reviews/${encodeURIComponent(briefId)}/annotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ annotation: trimmed }),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        const errMsg =
          errPayload.error?.message ||
          `Failed to record annotation (status ${res.status}).`;

        if (res.status === 400) {
          setFormError(`Validation error: ${errMsg}`);
        } else if (res.status === 409) {
          setFormError(`Conflict error (HTTP 409): ${errMsg} Please retry.`);
        } else if (res.status === 429) {
          setFormError(`Rate limit reached (HTTP 429): ${errMsg}`);
        } else {
          setFormError(`Submission error (${res.status}): ${errMsg}`);
        }
        return;
      }

      const json = await res.json();
      const updatedData: ReviewQueueResponse = json.data;

      // Update local view state with the newly annotated brief
      setUiState({
        status: "success",
        data: updatedData,
      });
      setAnnotationInput("");
      setFormSuccess("Operator annotation successfully appended to the immutable audit trail.");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Network error occurred while submitting annotation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyAdvisoryOutput = () => {
    if (currentUiState.status !== "success") return;
    const jsonStr = JSON.stringify(currentUiState.data.output, null, 2);

    navigator.clipboard?.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Review Queue
        </Link>

        {currentUiState.status === "success" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBrief(resolvedBriefId)}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="size-3" /> Refresh Brief
          </Button>
        )}
      </div>

      {/* 10-State Conditional Rendering */}
      {currentUiState.status === "loading" && (
        <div className="space-y-6" data-testid="detail-state-loading">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <Skeleton width={240} height={24} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
              <Skeleton width="100%" height={50} />
              <Skeleton width="100%" height={50} />
              <Skeleton width="100%" height={50} />
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
            <Skeleton width={180} height={20} />
            <Skeleton width="100%" height={120} />
          </div>
        </div>
      )}

      {currentUiState.status === "empty" && (
        <div data-testid="detail-state-empty">
          <EmptyState
            icon={<ClipboardCheck className="size-8 text-zinc-400" />}
            title="Brief Not Available"
            description="The requested compliance brief data could not be retrieved."
            actionLabel="Return to Queue"
            onAction={() => window.location.assign("/dashboard/reviews")}
          />
        </div>
      )}

      {currentUiState.status === "400" && (
        <div
          data-testid="detail-state-400"
          className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-8 text-center space-y-3"
        >
          <AlertTriangle className="size-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-amber-200">Validation Error (HTTP 400)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Link href="/dashboard/reviews" className="btn btn-outline inline-flex text-xs">
            Return to Queue
          </Link>
        </div>
      )}

      {currentUiState.status === "401" && (
        <div
          data-testid="detail-state-401"
          className="rounded-xl border border-red-800/60 bg-red-950/20 p-8 text-center space-y-3"
        >
          <ShieldAlert className="size-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-semibold text-red-200">Authentication Required (HTTP 401)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Link href="/login" className="btn btn-primary inline-flex text-xs">
            Sign In to ShadowSpark
          </Link>
        </div>
      )}

      {currentUiState.status === "403" && (
        <div
          data-testid="detail-state-403"
          className="rounded-xl border border-red-800/60 bg-red-950/20 p-8 text-center space-y-3"
        >
          <ShieldAlert className="size-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-semibold text-red-200">Access Forbidden (HTTP 403)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Cross-tenant boundaries and role authorizations are enforced fail-closed.
          </p>
        </div>
      )}

      {currentUiState.status === "404" && (
        <div
          data-testid="detail-state-404"
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center space-y-3"
        >
          <FileQuestion className="size-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-200">Brief Not Found (HTTP 404)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Link href="/dashboard/reviews" className="btn btn-outline inline-flex text-xs">
            Back to Queue
          </Link>
        </div>
      )}

      {currentUiState.status === "409" && (
        <div
          data-testid="detail-state-409"
          className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-8 text-center space-y-3"
        >
          <RefreshCw className="size-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-amber-200">State Conflict (HTTP 409)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchBrief(resolvedBriefId)}>
            Synchronize Brief
          </Button>
        </div>
      )}

      {currentUiState.status === "429" && (
        <div
          data-testid="detail-state-429"
          className="rounded-xl border border-orange-800/60 bg-orange-950/20 p-8 text-center space-y-3"
        >
          <Gauge className="size-10 text-orange-400 mx-auto" />
          <h3 className="text-lg font-semibold text-orange-200">Rate Limited (HTTP 429)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchBrief(resolvedBriefId)}>
            Retry Brief Lookup
          </Button>
        </div>
      )}

      {currentUiState.status === "503" && (
        <div
          data-testid="detail-state-503"
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center space-y-3"
        >
          <ServerOff className="size-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-200">
            Compliance Service Unavailable (HTTP {currentUiState.statusCode || 503})
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchBrief(resolvedBriefId)}>
            Retry Request
          </Button>
        </div>
      )}

      {/* Success View */}
      {currentUiState.status === "success" && (
        <div data-testid="detail-state-success" className="space-y-6">
          {/* Strict Invariant Advisory Banner */}
          <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-4 text-xs text-cyan-200 flex items-start gap-3 shadow-inner">
            <ShieldCheck className="size-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-cyan-100 text-sm">
                AI Advisory Output — Strictly Advisory, Non-Mutating
              </div>
              <p className="text-cyan-300/90 leading-relaxed">
                Upstream AI-ASSIST v1.1.0 output is strictly advisory. System-of-Record (SOR) status remains unchanged until an authorized compliance officer takes affirmative action. Under no circumstances does the AI system autonomously alter ledger entries or regulatory determinations.
              </p>
            </div>
          </div>

          {/* Overview Card */}
          <div className="dashboard-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-zinc-800 gap-2">
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Brief Identifier</span>
                <h2 className="text-lg font-mono font-bold text-white">{currentUiState.data.brief_id}</h2>
              </div>

              <div className="flex items-center gap-2">
                {currentUiState.data.queue_state === "annotated" ? (
                  <Badge variant="green">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Annotated
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="orange">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> Pending Review
                    </span>
                  </Badge>
                )}

                <Badge variant={currentUiState.data.sor_status_unchanged ? "green" : "red"}>
                  {currentUiState.data.sor_status_unchanged
                    ? "SOR Status: Preserved"
                    : "SOR Status: Mutated"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-400 block mb-1">Exception ID</span>
                <span className="font-mono text-zinc-200 font-semibold">{currentUiState.data.exception_id}</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-400 block mb-1">Tenant ID</span>
                <span className="font-mono text-zinc-200 font-semibold">{currentUiState.data.tenant_id}</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-400 block mb-1">Created Timestamp</span>
                <span className="font-mono text-zinc-200">
                  {new Date(currentUiState.data.created_at).toLocaleString("en-GB")}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Upstream Advisory Output Viewer */}
          <div className="dashboard-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="card-title text-sm font-semibold text-white">Upstream Advisory Findings</h3>
                <span className="card-sub text-xs text-zinc-400">
                  Raw AI-ASSIST v1.1.0 output payload
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAdvisoryOutput}
                className="flex items-center gap-1 text-xs"
              >
                <Copy className="size-3" />
                <span>{copied ? "Copied" : "Copy Output"}</span>
              </Button>
            </div>

            <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-x-auto max-h-96">
              <pre className="text-zinc-300 leading-relaxed">
                {JSON.stringify(currentUiState.data.output, null, 2)}
              </pre>
            </div>
          </div>

          {/* Immutable Annotation Trail */}
          <div className="dashboard-card space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="card-title text-sm font-semibold text-white flex items-center gap-2">
                <UserCheck className="size-4 text-cyan-400" /> Immutable Annotation Trail
              </h3>
              <span className="card-sub text-xs text-zinc-400">
                Chronological operator determinations and compliance review notes
              </span>
            </div>

            {currentUiState.data.annotations && currentUiState.data.annotations.length > 0 ? (
              <div className="space-y-3" data-testid="annotations-list">
                {currentUiState.data.annotations.map((ann: ReviewAnnotation, idx: number) => (
                  <div
                    key={ann.annotation_id || idx}
                    className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-semibold">
                          Operator: {ann.operator_id}
                        </span>
                        {ann.annotation_id && (
                          <span className="font-mono text-zinc-500">#{ann.annotation_id}</span>
                        )}
                      </div>
                      <span>{new Date(ann.created_at).toLocaleString("en-GB")}</span>
                    </div>
                    <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {ann.annotation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                data-testid="annotations-empty"
                className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-400"
              >
                No operator annotations have been appended to this brief yet.
              </div>
            )}
          </div>

          {/* Operator Annotation Form */}
          <div className="dashboard-card space-y-4" data-testid="annotation-form-card">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="card-title text-sm font-semibold text-white">Append Operator Annotation</h3>
              <span className="card-sub text-xs text-zinc-400">
                Submit human determination with client-side idempotency protection
              </span>
            </div>

            {formError && (
              <div
                data-testid="annotation-form-error"
                className="rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2"
              >
                <AlertTriangle className="size-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                data-testid="annotation-form-success"
                className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddAnnotation} className="space-y-3">
              <div>
                <label
                  htmlFor="annotation-input"
                  className="block text-xs font-medium text-zinc-300 mb-1"
                >
                  Operator Findings &amp; Regulatory Notes
                </label>
                <textarea
                  id="annotation-input"
                  data-testid="annotation-textarea"
                  rows={4}
                  value={annotationInput}
                  onChange={(e) => setAnnotationInput(e.target.value)}
                  placeholder="Enter detailed compliance rationale, verification evidence, or final review decision (max 2,000 characters)..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                  disabled={submitting}
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                  <span>Advisory output is non-binding; your annotation constitutes the formal record.</span>
                  <span className={annotationInput.length > 2000 ? "text-red-400 font-semibold" : ""}>
                    {annotationInput.length} / 2,000
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  data-testid="annotation-submit-button"
                  disabled={submitting || annotationInput.trim().length === 0}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Send className={`size-3.5 ${submitting ? "animate-spin" : ""}`} />
                  <span>{submitting ? "Recording..." : "Submit Annotation"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
