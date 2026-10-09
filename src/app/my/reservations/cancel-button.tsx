"use client";

import { useState, useTransition } from "react";
import { cancelMyBooking } from "@/app/actions/my-bookings";

const pill =
  "btn-press inline-flex min-h-11 items-center rounded-lg px-4 text-[0.95rem] font-semibold transition-colors disabled:opacity-50";

/** Cancel a room booking, with one confirm step. */
export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    // The question, then both answers side by side on one row (2026-10-10).
    return (
      <span className="block w-full rounded-2xl bg-mist p-4 sm:p-5">
        <span className="block text-[1rem] font-semibold text-ink">Cancel this booking?</span>
        <span className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelMyBooking(id);
                if (!r.ok) {
                  setError(r.formError ?? "Could not cancel.");
                  setConfirming(false);
                }
              })
            }
            className={`${pill} justify-center bg-sky-wash text-sky hover:bg-sky/15`}
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className={`${pill} justify-center border border-edge bg-paper-bright text-ink hover:border-clay`}
          >
            Keep it
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={() => setConfirming(true)} className={`${pill} text-ink-mute hover:bg-rule hover:text-ink`}>
        Cancel
      </button>
      {error ? <span className="text-[0.85rem] font-semibold text-clay-deep">{error}</span> : null}
    </span>
  );
}
