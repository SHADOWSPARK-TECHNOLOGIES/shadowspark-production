"use client";

import { useState } from "react";
import { trackMetaEvent } from "@/components/meta-events";

type CalendlyModalProps = {
  bookingUrl: string;
};

export default function CalendlyModal({ bookingUrl }: CalendlyModalProps) {
  const [open, setOpen] = useState(false);

  const openModal = () => {
    setOpen(true);
    trackMetaEvent("Lead");
  };

  const confirmBooking = () => {
    trackMetaEvent("Purchase");
    setOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Book a Demo
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <iframe
              src={bookingUrl}
              title="Calendly booking"
              className="h-[520px] w-full rounded-lg border border-zinc-800"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                I completed booking
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
