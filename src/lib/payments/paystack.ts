import crypto from "crypto";

const BASE = "https://api.paystack.co";

function authHeader() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` };
}

export async function getPaystackBalance(): Promise<number> {
  if (process.env.PAYMENTS_ENABLED !== "true") return 0;

  const res = await fetch(`${BASE}/balance`, { headers: authHeader() });
  const data = await res.json();
  if (!data.status) throw new Error("Failed to fetch Paystack balance");

  const ngnBalance = data.data.find((b: { currency: string; balance: number }) => b.currency === "NGN");
  const balance: number = ngnBalance?.balance ?? 0;
  console.log("[Paystack:balance] NGN balance:", balance, "kobo");
  return balance;
}

export async function initiateTransfer(
  amountKobo: number,
  recipientCode: string,
  reason: string
): Promise<{ transferCode: string; reference: string }> {
  if (process.env.PAYMENTS_ENABLED !== "true") {
    throw new Error("Payments are disabled. Set PAYMENTS_ENABLED=true to enable disbursements.");
  }

  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    throw new Error(`Amount must be a positive integer (kobo). Got: ${amountKobo}`);
  }

  const balance = await getPaystackBalance();
  if (balance < amountKobo) {
    throw new Error(
      `Insufficient Paystack balance. Required: ${amountKobo} kobo, Available: ${balance} kobo`
    );
  }

  const reference = `trf_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const res = await fetch(`${BASE}/transfer`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason,
      reference,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(`Transfer failed: ${data.message}`);

  console.log("[Paystack:transfer] Initiated transfer %s for %d kobo", reference, amountKobo);
  return { transferCode: data.data.transfer_code, reference };
}
