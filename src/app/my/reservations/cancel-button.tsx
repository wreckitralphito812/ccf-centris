"use client";

import { useState, useTransition } from "react";
import { cancelMyBooking } from "@/app/actions/my-bookings";

const pill =
  "btn-press inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-semibold transition-colors disabled:opacity-50";

/** Cancel a room booking, with one confirm step. */
export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[0.95rem] text-ink-soft">Cancel this booking?</span>
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
          className={`${pill} bg-sky-wash text-sky`}
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={`${pill} text-ink-mute`}>
          Keep it
        </button>
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
