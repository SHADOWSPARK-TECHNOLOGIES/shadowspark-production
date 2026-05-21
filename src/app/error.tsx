"use client";

import { useEffect } from "react";
import { BrowserWindow } from "@/components/ui/BrowserWindow";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the telemetry endpoint
    fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        metadata: {
          stack: error.stack,
          url: typeof window !== "undefined" ? window.location.href : "unknown",
        },
      }),
    }).catch(() => {
      // Ignore telemetry failure to avoid infinite loops
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-2xl">
        <BrowserWindow
          title="System Tripwire Tripped"
          eyebrow="Critical Runtime Exception"
          className="border-rose-500/20 shadow-[0_0_80px_rgba(244,63,94,0.1)]"
        >
          <div className="space-y-6 px-6 py-10 sm:px-10">
            <h2 className="text-2xl font-black text-rose-400">
              A runtime anomaly was detected.
            </h2>
            <p className="text-sm leading-7 text-zinc-300">
              The application encountered an unexpected state. Telemetry has automatically logged this digest to the Operator Dashboard for repair.
            </p>

            <div className="rounded-[1.4rem] border border-rose-500/10 bg-rose-500/2 p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-rose-400/80">
                Digest Signature
              </p>
              <code className="mt-2 block rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200">
                {error.digest || "No digest ID assigned"}
              </code>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-rose-400/80">
                Error Message
              </p>
              <code className="mt-2 block rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 break-words whitespace-pre-wrap">
                {error.message}
              </code>
            </div>

            <button
              onClick={() => reset()}
              className="mt-4 rounded-full bg-rose-500 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition hover:bg-rose-400"
            >
              Reboot Surface
            </button>
          </div>
        </BrowserWindow>
      </div>
    </div>
  );
}
