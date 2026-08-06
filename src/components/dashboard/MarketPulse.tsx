import React from "react";
import { LedgerService } from "@/lib/ledger";

export async function MarketPulse() {
  // Fetch Cash Account Balance
  const cashAccountId = "11111111-1111-1111-1111-111111111111";
  const { balance: balanceInKobo } = await LedgerService.getAccountBalance(cashAccountId);
  
  // Convert from Kobo to Naira
  const balanceInNaira = Number(balanceInKobo) / 100;
  
  // Check if liquidity is positive
  const isPositive = balanceInNaira >= 0;

  return (
    <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl">
      <h3 className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-2">
        Cash Account Balance
      </h3>
      <div className="flex items-center gap-3">
        <span
          className={`text-4xl font-bold ${
            isPositive ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          ₦{balanceInNaira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
        </span>
        {isPositive && (
          <span className="text-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
            Positive Liquidity
          </span>
        )}
      </div>
      <p className="text-slate-500 text-xs mt-4">
        Updated in real-time from the financial core.
      </p>
    </div>
  );
}
