"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sendWhatsAppMessage } from "@/app/actions/loans";

interface CommunicateClientProps {
  loanId: string;
  applicantName: string;
  phoneNumber: string;
}

export function CommunicateClient({ loanId, applicantName, phoneNumber }: CommunicateClientProps) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    setResult(null);
    startTransition(async () => {
      const res = await sendWhatsAppMessage(loanId, message);
      setResult(res);
      if (res.success) setMessage("");
    });
  }

  const QUICK_MESSAGES = [
    "Hi, please provide an additional document for verification.",
    "Your application is under review. We will contact you within 24 hours.",
    "Congratulations! Your loan has been approved. Disbursement is in progress.",
    "Please contact us urgently regarding your loan repayment.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Link href={`/dashboard/loans/${loanId}`} className="btn btn-ghost" style={{ padding: "4px 8px" }}>
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h2 className="card-title">Message {applicantName}</h2>
            <p className="card-sub">{phoneNumber}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="score-dim-label" style={{ marginBottom: "var(--space-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Quick Messages
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {QUICK_MESSAGES.map((qm) => (
            <button
              key={qm}
              className="btn btn-ghost"
              style={{ textAlign: "left", justifyContent: "flex-start", fontSize: 12 }}
              onClick={() => setMessage(qm)}
            >
              {qm}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-card">
        <div className="score-dim-label" style={{ marginBottom: "var(--space-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Custom Message
        </div>
        <textarea
          className="chat-input"
          placeholder="Type your message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: "100%", minHeight: 120, marginBottom: "var(--space-4)" }}
        />

        {result && (
          <div
            style={{
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
              borderRadius: 6,
              fontSize: 13,
              background: result.success ? "var(--color-success)11" : "var(--color-notification)11",
              color: result.success ? "var(--color-success)" : "var(--color-notification)",
              border: `1px solid ${result.success ? "var(--color-success)" : "var(--color-notification)"}44`,
            }}
          >
            {result.success ? "✅ Message sent successfully." : `❌ ${result.error}`}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={isPending || !message.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Send size={15} />
          {isPending ? "Sending…" : "Send via WhatsApp"}
        </button>
      </div>
    </div>
  );
}
