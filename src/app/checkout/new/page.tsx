import { Suspense } from "react";
import { Shield, Lock, Banknote, ScrollText } from "lucide-react";
import CheckoutClient from "../[leadId]/CheckoutClient";

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />;
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6 sm:p-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-5/6" />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-11/12" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>

          <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-10/12" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>
        </div>
      </section>

      <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6 sm:p-8">
        <Skeleton className="h-4 w-28" />
        <div className="mt-5 rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-10 w-32" />
          <Skeleton className="mt-4 h-4 w-5/6" />
        </div>
        <div className="mt-6 rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-11/12" />
        </div>
        <Skeleton className="mt-6 h-14 w-full rounded-full" />
      </aside>
    </div>
  );
}

export default function NewCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 p-4 lg:flex-row lg:items-start">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutClient leadId="new" />
        </Suspense>

        {/* Trust signals sidebar */}
        <aside className="hidden w-full max-w-sm space-y-4 lg:block">
          <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
              <Lock className="h-4 w-4" />
              Your $1 Demo Deposit
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                "Personalized demo environment configured to your use case",
                "Live walkthrough of your qualification and AI response flow",
                "Full audit report identifying conversion leaks in your current system",
                "Consultation with a senior infrastructure architect",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-6 text-zinc-400">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 text-xs leading-5 text-emerald-400/80">
              Your $1 deposit is fully credited toward your deployment&mdash;you are not paying for a demo, you are reserving engineering time for a tailored ShadowSpark environment.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6">
            <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
              <Shield className="h-3.5 w-3.5" />
              Trust & Infrastructure
            </h3>
            <div className="mt-4 space-y-3">
              {[
                { icon: Banknote, label: "Double-Entry Ledger", desc: "Every transaction verified" },
                { icon: Lock, label: "AES-256 Encryption at Rest", desc: "Bank-grade data security" },
                { icon: ScrollText, label: "NDPR-Compliant Data Handling", desc: "Nigerian data protection regulation" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <item.icon className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{item.label}</p>
                    <p className="text-[10px] text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
