"use client";

import { startTransition, useActionState, useState } from "react";
import { moveCourtRental, type CourtMoveResult } from "@/app/actions/court-rentals";
import { IconLine, StatusBadge, calmChipClass, choiceClass } from "@/components/booking";
import { cx } from "@/components/ui";
import {
  courtsLabel,
  dayLabel,
  freeThrough,
  peso,
  rentalDays,
  sportName,
  timeRange,
  windowsFor,
  type CourtHold,
  type Sport,
} from "@/lib/court-rentals";

export interface MyRental {
  id: string;
  sport: string;
  booked_on: string;
  start_hour: number;
  hours: number;
  courts: number;
  court_numbers: number[];
  amount_php: number;
}

/**
 * The member's Gym rentals (2026-10-20), each with a way to move it. Rentals
 * can't be cancelled (Adrian), so moving is the one action, up to the start,
 * even on the day itself.
 */
export function CourtRentals({
  rentals,
  holds,
  today,
  nowHour,
}: {
  rentals: MyRental[];
  holds: CourtHold[] | null;
  today: string;
  nowHour: number;
}) {
  return (
    <section aria-labelledby="courts-h">
      <h2 id="courts-h" className="text-[1.2rem] font-semibold text-ink">
        Gym rentals
      </h2>
      <ul className="mt-4 space-y-4">
        {rentals.map((r) => (
          <li key={r.id}>
            <RentalCard r={r} holds={holds} today={today} nowHour={nowHour} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RentalCard({ r, holds, today, nowHour }: { r: MyRental; holds: CourtHold[] | null; today: string; nowHour: number }) {
  const [moving, setMoving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const started = r.booked_on < today || (r.booked_on === today && r.start_hour <= nowHour);
  return (
    <article className="calm-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[1.2rem] font-semibold text-ink">
          {sportName(r.sport)} · {courtsLabel(r.sport, r.court_numbers)}
        </p>
        <StatusBadge tone="ok">Booked</StatusBadge>
      </div>
      <div className="mt-4 space-y-2.5">
        <IconLine icon="calendar">{dayLabel(r.booked_on)}</IconLine>
        <IconLine icon="clock">{timeRange(r.start_hour, r.hours)}</IconLine>
        <IconLine icon="check">Paid {peso(r.amount_php)}</IconLine>
        <IconLine icon="pin">Gym, CCF Centris</IconLine>
      </div>
      {done ? (
        <p role="status" className="mt-5 rounded-2xl bg-clay-wash px-5 py-4 text-[1rem] font-semibold text-clay-deep">
          Moved: {done}. We’ve emailed you the new time.
        </p>
      ) : null}
      {started ? null : moving ? (
        <MoveForm r={r} holds={holds} today={today} nowHour={nowHour} onDone={(s) => { setDone(s); setMoving(false); }} onClose={() => setMoving(false)} />
      ) : (
        <div className="mt-6 border-t border-rule pt-5">
          <button
            type="button"
            onClick={() => setMoving(true)}
            className="btn-press inline-flex min-h-12 items-center rounded-lg border border-clay px-5 text-[1rem] font-semibold text-clay hover:bg-clay-wash"
          >
            Move to another time
          </button>
          <p className="mt-3 text-[0.92rem] text-ink-mute">Rentals can’t be cancelled, but you can move yours until it starts.</p>
        </div>
      )}
    </article>
  );
}

function MoveForm({
  r,
  holds,
  today,
  nowHour,
  onDone,
  onClose,
}: {
  r: MyRental;
  holds: CourtHold[] | null;
  today: string;
  nowHour: number;
  onDone: (summary: string) => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<CourtMoveResult | null, FormData>(async (prev, fd) => {
    const res = await moveCourtRental(prev, fd);
    if (res.ok && res.summary) onDone(res.summary);
    return res;
  }, null);
  const sport = r.sport as Sport;
  const days = rentalDays(today, true).filter((d) => windowsFor(d, sport).length);
  const [date, setDate] = useState(days.includes(r.booked_on) ? r.booked_on : (days[0] ?? ""));
  const [start, setStart] = useState<number | null>(null);
  // Its own courts don't count as taken.
  const others = (holds ?? []).filter((h) => h.rental !== r.id);
  const starts = windowsFor(date, sport).flatMap((w) =>
    Array.from({ length: Math.max(0, w.to - w.from - r.hours + 1) }, (_, i) => w.from + i),
  ).filter((h) => !(date === today && h <= nowHour));
  const usable = (h: number) =>
    !(date === r.booked_on && h === r.start_hour) && (!holds || freeThrough(sport, date, h, r.hours, others) >= r.courts);
  const chosen = start !== null && starts.includes(start) && usable(start) ? start : null;

  return (
    <form
      className="mt-6 space-y-6 border-t border-rule pt-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (chosen === null || pending) return;
        startTransition(() => action(new FormData(ev.currentTarget)));
      }}
    >
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={chosen ?? ""} />
      <div>
        <p id={`move-day-${r.id}`} className="text-[1.05rem] font-semibold text-ink">
          Which day?
        </p>
        <div role="radiogroup" aria-labelledby={`move-day-${r.id}`} className="mt-3 flex flex-wrap gap-2">
          {days.map((d) => (
            <label key={d} className={calmChipClass(date === d)}>
              <input
                type="radio"
                name={`move_date_${r.id}`}
                checked={date === d}
                onChange={() => {
                  setDate(d);
                  setStart(null);
                }}
                className="sr-only"
              />
              <span className={cx(date === d && "font-semibold")}>{dayLabel(d).replace(/^(\w{3})\w*/, "$1")}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p id={`move-time-${r.id}`} className="text-[1.05rem] font-semibold text-ink">
          What time?
        </p>
        <p className="mt-1 text-[0.92rem] text-ink-mute">
          Same sport, {r.hours} {r.hours === 1 ? "hour" : "hours"} and {r.courts} {r.courts === 1 ? "court" : "courts"}, so the price stays the same.
        </p>
        {starts.length ? (
          <div role="radiogroup" aria-labelledby={`move-time-${r.id}`} className="mt-3 grid gap-3 sm:grid-cols-2">
            {starts.map((h) => {
              const ok = usable(h);
              const on = chosen === h;
              return (
                <label key={h} className={cx("flex min-h-[3.5rem] items-center justify-between gap-3 px-5 py-3", choiceClass(on, !ok))}>
                  <input type="radio" name={`move_start_${r.id}`} checked={on} disabled={!ok} onChange={() => setStart(h)} className="sr-only" />
                  <span className={cx("whitespace-nowrap text-[1rem]", ok && "font-semibold")}>{timeRange(h, r.hours)}</span>
                  {!ok ? (
                    <span className="text-[0.88rem] text-ink-mute">{date === r.booked_on && h === r.start_hour ? "Yours now" : "Taken"}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-[1rem] text-ink-mute">No times left on this day. Try another.</p>
        )}
      </div>
      {state && !state.ok && state.formError ? (
        <p role="alert" className="rounded-2xl bg-sky-wash px-5 py-4 text-[1rem] font-semibold text-sky">
          {state.formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={chosen === null || pending}
          className="btn-press inline-flex min-h-12 items-center rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Moving…" : "Move my rental"}
        </button>
        <button type="button" onClick={onClose} className="min-h-12 px-3 text-[1rem] font-semibold text-ink-mute hover:text-ink">
          Keep it as it is
        </button>
      </div>
    </form>
  );
}
