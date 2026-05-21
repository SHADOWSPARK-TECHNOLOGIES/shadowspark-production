"use client";
import { loginUser } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasskeyClient } from "@/components/auth/PasskeyClient";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePasskey, setUsePasskey] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#111827]/80 p-8 shadow-2xl backdrop-blur-sm border border-[#d4a843]/10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            ShadowSpark
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {usePasskey
              ? "Sign in with phishing-resistant passkey"
              : "Sign in to your account"}
          </p>
        </div>

        {/* Mode toggle — passkey-first emphasis */}
        <div className="flex rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={() => setUsePasskey(true)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
              usePasskey
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Passkey
          </button>
          <button
            onClick={() => setUsePasskey(false)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
              !usePasskey
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Password
          </button>
        </div>

        {usePasskey ? (
          <PasskeyClient
            mode="login"
            onSuccess={() => router.push("/dashboard")}
          />
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                name="email"
                id="email"
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                name="password"
                id="password"
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder={"\u2022".repeat(8)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#d4a843] to-[#c0935a] px-4 py-3 font-semibold text-white shadow-lg hover:from-[#e8c56d] hover:to-[#d4a843] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400">
          {"Don\u2019t have an account? "}
          <a href="/register" className="font-medium text-[#d4a843] hover:text-cyan-300">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
