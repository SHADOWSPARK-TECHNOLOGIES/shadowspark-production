import Link from "next/link";

export default async function NewCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-3">
          Online checkout is currently unavailable.
        </h2>
        <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
          Contact us to start your pilot. We configure tailored environments and support direct bank transfers.
        </p>
        <Link
          href="/contact"
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg"
        >
          Contact us to start your pilot
        </Link>
      </div>
    </div>
  );
}
