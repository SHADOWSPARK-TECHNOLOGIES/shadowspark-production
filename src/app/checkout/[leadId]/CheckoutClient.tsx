'use client';
import { useState } from "react";
import { PRICING_PACKAGES } from "@/config/pricing";
import { Button } from "@/components/ui/button";

export default function CheckoutClient({ leadId }: { leadId: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [leadVolume, setLeadVolume] = useState("0-50");
  const [painPoint, setPainPoint] = useState("");
  const [packageId, setPackageId] = useState(PRICING_PACKAGES[0].id);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPackage = PRICING_PACKAGES.find(p => p.id === packageId);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Initialize Paystack Transaction
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: 100, // $1 Demo Deposit (in kobo)
          leadId: leadId === "new" ? `new_${Date.now()}` : leadId,
          metadata: { companyName, goal, packageId }
        }),
      });

      const data = await response.json();
      
      if (data.status && data.data.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error(data.message || "Failed to initialize payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
        <h2 className="text-2xl font-bold mb-2 text-white">Let{"'"}s Audit Your Needs</h2>
        <p className="text-zinc-500 mb-6">Tell us about your operations so we can configure your personalized demo environment.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
          <div>
            <label htmlFor="checkout-company" className="block text-sm font-medium mb-1 text-white">Company Name</label>
            <input
              id="checkout-company"
              required
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="checkout-email" className="block text-sm font-medium mb-1 text-white">Email Address</label>
            <input
              id="checkout-email"
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white focus:ring-2 focus:ring-emerald-500"
              placeholder="you@company.com"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkout-volume" className="block text-sm font-medium mb-1 text-white">Monthly Lead Volume</label>
              <select
                id="checkout-volume"
                value={leadVolume}
                onChange={e => setLeadVolume(e.target.value)}
                className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white"
              >
                <option value="0-50">0 - 50</option>
                <option value="51-200">51 - 200</option>
                <option value="200+">200+</option>
              </select>
            </div>
            <div>
              <label htmlFor="checkout-package" className="block text-sm font-medium mb-1 text-white">Target Package</label>
              <select
                id="checkout-package"
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white"
              >
                {PRICING_PACKAGES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="checkout-painpoint" className="block text-sm font-medium mb-1 text-white">Biggest Operational Pain Point</label>
            <textarea
              id="checkout-painpoint"
              required
              value={painPoint}
              onChange={e => setPainPoint(e.target.value)}
              className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white"
              rows={2}
              placeholder="e.g. Slow response times, lost leads..."
            />
          </div>

          <div>
            <label htmlFor="checkout-goal" className="block text-sm font-medium mb-1 text-white">Main Goal with AI</label>
            <textarea
              id="checkout-goal"
              required
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full p-3 border border-zinc-700 rounded-md bg-transparent text-white"
              rows={2}
              placeholder="e.g. Automate qualification, 24/7 support..."
            />
          </div>
          
          <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-500 py-3 mt-4 rounded-md font-medium text-lg">
            Generate Audit & Continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Your Mini-Audit Summary</h2>
      
      <div className="bg-emerald-950/20 p-5 rounded-lg mb-6 border border-emerald-500/20">
        <h3 className="font-semibold text-emerald-400 mb-2">Analysis for {companyName || "Your Company"}</h3>
        <p className="text-sm text-zinc-300 mb-3">
          Handling <strong>{leadVolume} leads/month</strong> with a primary pain point of <em>{"\u201C"}{painPoint}{"\u201D"}</em> means significant revenue is currently leaking.
          The <strong>{selectedPackage?.name}</strong> package is positioned to directly resolve this and achieve your goal to <em>{"\u201C"}{goal}{"\u201D"}</em>.
        </p>
      </div>

      {/* Inline error display — replaces the previous browser alert() */}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleCheckout} className="space-y-6">
        <div className="bg-zinc-800 p-5 rounded-lg border border-zinc-700">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-white">Demo Deposit</span>
            <span className="text-xl font-bold text-white">$1</span>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            This $1 deposit secures your environment and is <strong>fully credited toward your final deployment</strong>. We use it to prepare a tailored ShadowSpark instance and a guided walkthrough of your funnel.
          </p>
          
          <div className="flex items-start gap-3 mt-4 pt-4 border-t border-zinc-700">
            <input required type="checkbox" id="terms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4" />
            <label htmlFor="terms" className="text-sm text-zinc-400">
              I accept the Terms and Privacy Policy, and I understand this $1 deposit is fully credited toward my first invoice if I deploy ShadowSpark.
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="button" onClick={() => setStep(1)} variant="outline" className="w-1/3">
            Back
          </Button>
          <Button disabled={loading || !termsAccepted} type="submit" className="w-2/3 bg-emerald-600 text-white hover:bg-emerald-500">
            {loading ? "Processing..." : "Pay $1 & Configure My Demo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
