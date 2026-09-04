"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui";
import { cancelMyBooking } from "@/app/actions/my-bookings";

export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[0.82rem] text-ink-soft">Cancel this booking?</span>
        <Button
          tone="ghost"
          onClick={() =>
            start(async () => {
              const r = await cancelMyBooking(id);
              if (!r.ok) {
                setError(r.formError ?? "Could not cancel.");
                setConfirming(false);
              }
            })
          }
          disabled={pending}
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </Button>
        <Button tone="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Keep it
        </Button>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button tone="ghost" onClick={() => setConfirming(true)}>
        Cancel booking
      </Button>
      {error ? (
        <span className="text-[0.8rem] font-semibold text-clay-deep">{error}</span>
      ) : null}
    </span>
  );
}
