"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
  FileQuestion,
  RefreshCw,
  Gauge,
  ServerOff,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReviewQueueSummary } from "@/lib/ai-assist/types";
import DataTable from "@/components/dashboard/DataTable";
import EmptyState from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/dashboard/Skeleton";
import Badge from "@/components/dashboard/Badge";
import { Button } from "@/components/ui/button";

export type QueueStateFilter = "all" | "pending_review" | "annotated";

export type QueueUIState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "success"; data: ReviewQueueSummary[]; total: number }
  | { status: "400"; message: string }
  | { status: "401"; message: string }
  | { status: "403"; message: string }
  | { status: "404"; message: string }
  | { status: "409"; message: string }
  | { status: "429"; message: string }
  | { status: "503"; message: string; statusCode: number };

export default function ReviewsPage(props: any) {
  const initialFilter = props.initialFilter ?? "all";
  const simulatedState = props.simulatedState;
  const [filter, setFilter] = useState<QueueStateFilter>(initialFilter);
  const [uiState, setUiState] = useState<QueueUIState>(
    simulatedState ?? { status: "loading" }
  );
  const currentUiState = simulatedState ?? uiState;


  const fetchReviews = useCallback(async (activeFilter: QueueStateFilter) => {
    setUiState({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") {
        params.set("state", activeFilter);
      }
      params.set("limit", "50");
      params.set("offset", "0");

      const res = await fetch(`/api/compliance/reviews?${params.toString()}`);

      if (res.status === 400) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "400",
          message: payload.error?.message || "Invalid review queue query parameters.",
        });
        return;
      }
      if (res.status === 401) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "401",
          message: payload.error?.message || "Authentication required to access compliance reviews.",
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
          message: payload.error?.message || "Compliance review queue not found.",
        });
        return;
      }
      if (res.status === 409) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "409",
          message: payload.error?.message || "Review queue state conflict encountered.",
        });
        return;
      }
      if (res.status === 429) {
        const payload = await res.json().catch(() => ({}));
        setUiState({
          status: "429",
          message:
            payload.error?.message ||
            "Compliance review request throttled. Upstream rate limit reached.",
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
      const items: ReviewQueueSummary[] = json.data?.items ?? [];
      if (items.length === 0) {
        setUiState({ status: "empty" });
      } else {
        setUiState({
          status: "success",
          data: items,
          total: json.data?.total ?? items.length,
        });
      }
    } catch (err: unknown) {
      setUiState({
        status: "503",
        statusCode: 503,
        message:
          err instanceof Error
            ? err.message
            : "Network error contacting compliance service.",
      });
    }
  }, []);

  useEffect(() => {
    if (!simulatedState) {
      fetchReviews(filter);
    }
  }, [fetchReviews, filter, simulatedState]);


  const columns = useMemo<ColumnDef<ReviewQueueSummary, unknown>[]>(
    () => [
      {
        accessorKey: "brief_id",
        header: "Brief ID",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/reviews/${row.original.brief_id}`}
            className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
          >
            {row.original.brief_id}
          </Link>
        ),
      },
      {
        accessorKey: "exception_id",
        header: "Exception ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-zinc-300">
            {row.original.exception_id}
          </span>
        ),
      },
      {
        accessorKey: "queue_state",
        header: "State",
        cell: ({ row }) => {
          const state = row.original.queue_state;
          return state === "annotated" ? (
            <Badge variant="green">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 inline" /> Annotated
              </span>
            </Badge>
          ) : (
            <Badge variant="orange">
              <span className="flex items-center gap-1">
                <Clock className="size-3 inline" /> Pending Review
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "sor_status_unchanged",
        header: "SOR Integrity",
        cell: ({ row }) => (
          <Badge variant={row.original.sor_status_unchanged ? "green" : "red"}>
            {row.original.sor_status_unchanged ? "Preserved" : "Mutated"}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        cell: ({ row }) => {
          try {
            return new Date(row.original.created_at).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            return row.original.created_at;
          }
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/reviews/${row.original.brief_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors"
          >
            Review &rarr;
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="size-6 text-cyan-400" /> Exception Review Queue
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Human-in-the-loop exception review · AI Advisory v1.1.0 · Non-mutating governance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <Filter className="size-3.5 text-zinc-400 ml-1.5" />
            <button
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === "all" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === "pending_review" ? "bg-zinc-800 text-amber-300 font-medium" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setFilter("pending_review")}
            >
              Pending
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === "annotated" ? "bg-zinc-800 text-emerald-300 font-medium" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setFilter("annotated")}
            >
              Annotated
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReviews(filter)}
            disabled={currentUiState.status === "loading"}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${currentUiState.status === "loading" ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Strict Non-Mutation Architecture Banner */}
      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-4 py-3 text-xs text-cyan-300 flex items-start gap-2.5">
        <div className="p-0.5 mt-0.5">
          <span className="inline-block size-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <div>
          <span className="font-semibold text-cyan-200">Advisory Invariant:</span> AI compliance briefs are strictly advisory. System-of-Record decisions require human operator review. No automated decision will mutate core transaction ledgers.
        </div>
      </div>

      {/* 10-State Conditional Rendering */}
      {currentUiState.status === "loading" && (
        <div className="space-y-4" data-testid="state-loading">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <Skeleton width={180} height={20} />
              <Skeleton width={100} height={20} />
            </div>
            <Skeleton width="100%" height={38} />
            <Skeleton width="100%" height={38} />
            <Skeleton width="100%" height={38} />
            <Skeleton width="100%" height={38} />
          </div>
        </div>
      )}

      {currentUiState.status === "empty" && (
        <div data-testid="state-empty">
          <EmptyState
            icon={<ClipboardCheck className="size-8 text-zinc-400" />}
            title="Review Queue Clear"
            description="No compliance exceptions are currently awaiting review for your tenant."
            actionLabel="Refresh Queue"
            onAction={() => fetchReviews(filter)}
          />
        </div>
      )}

      {currentUiState.status === "success" && (
        <div data-testid="state-success" className="space-y-3">
          <div className="text-xs text-zinc-400">
            Displaying <span className="text-zinc-200 font-semibold">{currentUiState.data.length}</span> of{" "}
            <span className="text-zinc-200 font-semibold">{currentUiState.total}</span> exception records
          </div>
          <DataTable
            columns={columns}
            data={currentUiState.data}
            emptyTitle="No records found matching filter"
            emptyDescription="Try selecting a different filter state above."
          />
        </div>
      )}

      {currentUiState.status === "400" && (
        <div
          data-testid="state-400"
          className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-8 text-center space-y-3"
        >
          <AlertTriangle className="size-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-amber-200">Validation Failure (HTTP 400)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchReviews("all")}>
            Reset Filters &amp; Retry
          </Button>
        </div>
      )}

      {currentUiState.status === "401" && (
        <div
          data-testid="state-401"
          className="rounded-xl border border-red-800/60 bg-red-950/20 p-8 text-center space-y-3"
        >
          <ShieldAlert className="size-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-semibold text-red-200">Authentication Required (HTTP 401)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Link href="/login" className="btn btn-primary inline-flex">
            Sign In to ShadowSpark
          </Link>
        </div>
      )}

      {currentUiState.status === "403" && (
        <div
          data-testid="state-403"
          className="rounded-xl border border-red-800/60 bg-red-950/20 p-8 text-center space-y-3"
        >
          <ShieldAlert className="size-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-semibold text-red-200">Access Forbidden (HTTP 403)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Multi-Tenant Isolation: Access to compliance review requires an authoritative TenantMembership and an authorized operator role.
          </p>
        </div>
      )}

      {currentUiState.status === "404" && (
        <div
          data-testid="state-404"
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center space-y-3"
        >
          <FileQuestion className="size-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-200">Resource Not Found (HTTP 404)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(filter)}>
            Retry Queue Lookup
          </Button>
        </div>
      )}

      {currentUiState.status === "409" && (
        <div
          data-testid="state-409"
          className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-8 text-center space-y-3"
        >
          <RefreshCw className="size-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-amber-200">State Conflict (HTTP 409)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(filter)}>
            Synchronize Queue State
          </Button>
        </div>
      )}

      {currentUiState.status === "429" && (
        <div
          data-testid="state-429"
          className="rounded-xl border border-orange-800/60 bg-orange-950/20 p-8 text-center space-y-3"
        >
          <Gauge className="size-10 text-orange-400 mx-auto" />
          <h3 className="text-lg font-semibold text-orange-200">Rate Limited (HTTP 429)</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <p className="text-xs text-zinc-500">
            LLM06 Compliance Governance: Model inquiry quota temporarily reached. Please allow time before retrying.
          </p>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(filter)}>
            Retry After Delay
          </Button>
        </div>
      )}

      {currentUiState.status === "503" && (
        <div
          data-testid="state-503"
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center space-y-3"
        >
          <ServerOff className="size-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-200">
            Service Unavailable (HTTP {currentUiState.statusCode || 503})
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{currentUiState.message}</p>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(filter)}>
            Retry Service Call
          </Button>
        </div>
      )}
    </div>
  );
}
