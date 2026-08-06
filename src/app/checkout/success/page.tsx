import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  
  let demoSlug = null;
  if (reference) {
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { lead: { include: { demo: true } } },
    });
    demoSlug = payment?.lead?.demo?.slug;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <section className="max-w-md w-full rounded-[2.5rem] border border-zinc-800 bg-zinc-950/90 p-10 text-center shadow-[0_0_80px_rgba(16,149,106,0.1)]">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,149,106,0.4)]">
          <span className="text-white font-black text-3xl">✓</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Payment Verified</h1>
        <p className="text-zinc-400 mb-10 leading-relaxed">
          {demoSlug 
            ? "Your tailored intelligence environment is now ready for review."
            : "The ShadowSpark system has registered your access. Your environment is being provisioned."}
        </p>
        
        <div className="flex flex-col gap-4">
          {demoSlug ? (
            <Link 
              href={`/demo/${demoSlug}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-500 active:scale-95 shadow-[0_0_20px_rgba(16,149,106,0.3)]"
            >
              Launch Demo Surface
            </Link>
          ) : (
            <Link 
              href="/"
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-500 active:scale-95 shadow-[0_0_20px_rgba(16,149,106,0.3)]"
            >
              Return to Hub
            </Link>
          )}
          
          <Link href="/contact" className="text-sm font-mono uppercase tracking-widest text-zinc-500 hover:text-emerald-400 transition">
            Need Support?
          </Link>
        </div>
      </section>
    </main>
  );
}
