"use client";

import { useEffect, useState } from "react";
import { trackCheckoutView } from "@/app/actions/track-checkout";
import { getLeadForPayment, verifyPayment } from "@/app/actions/checkout-actions";
import { useParams, useRouter } from "next/navigation";
import { usePaystackPayment } from 'react-paystack';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = typeof params.leadId === 'string' ? params.leadId : Array.isArray(params.leadId) ? params.leadId[0] : '';

  const [leadEmail, setLeadEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (leadId) {
      trackCheckoutView(leadId).catch(console.error);
      
      // Fetch dynamic lead email
      getLeadForPayment(leadId)
        .then((lead) => {
          if (lead.email) setLeadEmail(lead.email);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const paystackConfig = {
    reference: `shadowspark_${leadId}_${new Date().getTime()}`,
    email: leadEmail || "lead@example.com",
    amount: 100, // $1 Demo Deposit (in kobo)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePayment = () => {
    if (!leadEmail) {
      alert("Please ensure your email is registered before proceeding.");
      return;
    }
    
    initializePayment({ 
      onSuccess: async (reference: any) => {
        setProcessing(true);
        const refId = typeof reference === 'string' ? reference : reference.reference || reference.trans;
        const result = await verifyPayment(leadId, refId);
        
        if (result.success) {
          alert("Payment successful! Reserving your environment...");
          router.push(`/demo/${leadId}`); // or a dedicated success page
        } else {
          alert("Payment verified, but there was an error updating your status.");
          setProcessing(false);
        }
      }, 
      onClose: () => {
        console.log("Payment modal closed by user.");
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-emerald-400 flex items-center justify-center font-sans">
        <span className="animate-pulse">Loading secure checkout...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center py-20 px-6 font-sans">
      <div className="max-w-6xl w-full">
        {/* Trust Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 tracking-widest uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Powered by ShadowSpark AI • Secure Checkout
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Mini-Audit Summary */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-3">Engine Tier: Semantic Growth</p>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-4">
              Semantic Growth
            </h1>
            
            <p className="text-zinc-300 leading-relaxed mb-8">
              Based on your audit, the priority is high‑intent lead qualification. We will deploy the ShadowSpark Vault Intelligence to handle website‑to‑WhatsApp handoffs using pgvector semantic matching.
            </p>

            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800/50">
              <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-4">Priority Actions:</h3>
              <ul className="space-y-3 text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                  <span>Activate Semantic Lead Capture</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                  <span>Deploy WhatsApp‑to‑Vault Automation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                  <span>Track Intent & Conversions</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-3">Demo Deposit</p>
              
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-white tracking-tighter mb-4">$1</div>
                <p className="text-sm text-emerald-400/80 font-medium">
                  Fully credited toward your first invoice if you deploy.
                </p>
              </div>

              <div className="bg-emerald-950/20 rounded-xl p-4 border border-emerald-500/20 mb-6">
                <p className="text-sm text-zinc-300">
                  This demo deposit secures a tailored ShadowSpark environment&mdash;configured around your funnel, not a generic slide deck.
                </p>
              </div>
            </div>

            {/* Paystack / Payment Integration */}
            <button
              className="w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-bold text-white transition-all hover:bg-emerald-500 hover:scale-[1.02] shadow-[0_0_30px_rgba(16,149,106,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-emerald-600"
              onClick={handlePayment}
              disabled={processing || !leadEmail}
            >
              {processing ? "Verifying..." : "Pay $1 (Fully Credited)"}
            </button>
            {!leadEmail && (
              <p className="text-center text-xs text-red-400 mt-3">Unable to load lead profile.</p>
            )}
          </div>
        </div>

        {/* What Happens Next */}
        <div className="mt-12">
          <h3 className="text-center text-sm uppercase tracking-widest text-zinc-500 font-bold mb-6">What happens next?</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center">
              <div className="text-emerald-400 font-bold text-xl mb-2">1</div>
              <p className="text-sm text-zinc-400">Deposit locked & environment reserved instantly.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center">
              <div className="text-emerald-400 font-bold text-xl mb-2">2</div>
              <p className="text-sm text-zinc-400">Semantic Intelligence configured for your lead pipeline.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center">
              <div className="text-emerald-400 font-bold text-xl mb-2">3</div>
              <p className="text-sm text-zinc-400">Live platform access & comprehensive onboarding begins.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}