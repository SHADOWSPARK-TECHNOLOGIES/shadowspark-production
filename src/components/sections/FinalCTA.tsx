"use client";

import Link from "next/link";
import { trackMetaEvent } from "@/components/meta-events";

type FinalCTAProps = {
  whatsappUrl: string;
};

export default function FinalCTA({ whatsappUrl }: FinalCTAProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
      <h2 className="text-3xl font-semibold text-white">Ready to launch?</h2>
      <p className="mt-3 text-zinc-400">Talk to our team and deploy your fintech operations stack.</p>
      <div className="mt-8">
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackMetaEvent("Contact")}
          className="inline-flex rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Contact on WhatsApp
        </Link>
      </div>
    </section>
  );
}
