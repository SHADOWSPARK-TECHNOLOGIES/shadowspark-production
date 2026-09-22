"use client"
import { registerUser } from "@/app/actions/auth"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Passkeys disabled until WEBAUTHN_ENABLED=true + Sec clearance (API also 503).
  const usePasskey = false
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await registerUser(formData)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm border border-purple-500/20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">ShadowSpark</h1>
          <p className="mt-2 text-sm text-slate-400">
            {usePasskey ? "Register with phishing-resistant passkey" : "Create your account"}
          </p>
        </div>

        

        
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
              <input name="name" id="name" type="text" required className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" placeholder="John Doe" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
              <input name="email" id="email" type="email" required className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
              <input name="password" id="password" type="password" required className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        

        <p className="text-center text-sm text-slate-400">Already have an account? <a href="/login" className="font-medium text-cyan-400 hover:text-cyan-300">Sign in</a></p>
      </div>
    </div>
  )
}
