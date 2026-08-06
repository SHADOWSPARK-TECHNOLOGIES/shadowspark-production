"use client";

import React, { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";

interface TelemetryData {
  queueStatus: "IDLE" | "PROCESSING" | "SURGE";
  queueLength: number;
  lastSync: string | null;
  pgvectorHealth: "ONLINE" | "DEGRADED" | "OFFLINE";
  indexSize: number;
}

export default function LiveTelemetryPanel() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    queueStatus: "IDLE",
    queueLength: 0,
    lastSync: new Date().toLocaleTimeString(),
    pgvectorHealth: "ONLINE",
    indexSize: 1420, // Mock vector count for now
  });

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const res = await fetch("/api/operator/queue-stats");
        if (res.ok) {
          const data = await res.json();
          setTelemetry((prev) => ({
            ...prev,
            queueLength: data.queueLength,
            queueStatus: data.queueStatus,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch telemetry:", err);
      }
    }

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="p-6 border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">
          UOM Telemetry
        </p>
        <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-green-300 bg-green-400/10 px-2 py-1 rounded-full">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          Active
        </span>
      </div>

      <div className="space-y-6">
        {/* BullMQ Queue Status */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">BullMQ Ingestion</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
              telemetry.queueStatus === 'IDLE' ? 'bg-zinc-800 text-zinc-300' :
              telemetry.queueStatus === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400 animate-pulse'
            }`}>
              {telemetry.queueStatus}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (telemetry.queueLength / 10) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-mono">{telemetry.queueLength} msg</span>
          </div>
        </div>

        {/* Vector Health */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">PgVector Engine</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-green-500/20 text-green-400">
              {telemetry.pgvectorHealth}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total Embeddings</span>
            <span className="font-mono text-zinc-300">{telemetry.indexSize.toLocaleString()}</span>
          </div>
        </div>

        {/* GCS RAG Sync */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">GCS Knowledge Sync</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Last Successful Pull</span>
            <span className="font-mono text-zinc-300">{telemetry.lastSync}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
