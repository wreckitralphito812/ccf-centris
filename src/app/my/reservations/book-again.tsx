"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { rebookDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import { nightLabel } from "@/lib/dgroup-tables";

/**
 * "Book again" for a Dgroup table: the same weekday, time and headcount at
 * the next open date (2026-09-30). `target` is that date, worked out where
 * this renders; null means the week isn't open yet, so it says so instead.
 */
export function BookAgain({ id, target, label }: { id: string; target: string | null; label?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<DgroupBookingResult | null>(null);

  if (!target) {
    return <span className="text-[0.92rem] text-ink-mute">Book again opens 8 days ahead</span>;
  }
  if (result?.ok && result.booking) {
    return (
      <span role="status" className="text-[0.95rem] font-semibold text-moss">
        Booked: {result.booking.tables}, {result.booking.night}
      </span>
    );
  }
  const day = nightLabel(target).split(",")[0].slice(0, 3);
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await rebookDgroupTable(id)))}
        className="btn-press inline-flex min-h-11 items-center rounded-lg border border-clay px-5 text-[0.95rem] font-semibold text-clay transition-colors hover:bg-clay-wash disabled:opacity-50"
      >
        {pending ? "Booking…" : (label ?? `Book again for ${day}, ${nightLabel(target).split(", ")[1]}`)}
      </button>
      {result && !result.ok ? (
        <span role="alert" className="text-[0.88rem] font-semibold text-clay-deep">
          {result.formError ?? result.fieldErrors?.slotId ?? "That couldn’t be booked."}
          {result.needsAuth ? (
            <>
              {" "}
              <Link href="/sign-in?next=/my/reservations" className="underline underline-offset-4">
                Sign in
              </Link>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
