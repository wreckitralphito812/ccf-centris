"use client";

import { startTransition, useActionState, useState } from "react";
import {
  cancelDgroupBooking,
  changeDgroupBooking,
  type DgroupChangeResult,
} from "@/app/actions/dgroup-tables";
import { AddToCalendar, FieldError, StepButton, calmChipClass, countInputClass } from "@/components/booking";
import { cx } from "@/components/ui";
import { dgroupEvent, roomEvent } from "@/lib/calendar";
import { MAX_GROUP_SIZE, type NightOption } from "@/lib/dgroup-tables";
import type { Upcoming } from "@/lib/my-bookings";
import { shortNight } from "@/app/reserve/dgroup/booking-form";
import { BookAgain } from "./book-again";
import { CancelButton } from "./cancel-button";

/**
 * What a member can do with one booking (2026-09-30): add it to a calendar,
 * change a Dgroup table's day, time or headcount, cancel, and book the same
 * table again. Shared by the Next up card and the Manage rows.
 */
export function BookingActions({
  item,
  nights,
  rebookTarget,
  reference,
}: {
  item: Upcoming;
  nights: NightOption[];
  rebookTarget: string | null;
  reference: string;
}) {
  const [changing, setChanging] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const t = item.table;
  const r = item.room;

  const event = t
    ? dgroupEvent({ date: t.booked_on, slotId: t.slot_id, roomSlug: t.room_slug, labels: t.table_labels })
    : r
      ? roomEvent({
          reference,
          activity: item.title,
          rooms: [r.facility_name ?? "Room"],
          date: item.date,
          start: minutesToHHMM(r.starts_at),
          end: minutesToHHMM(r.ends_at),
          confirmed: r.status === "approved",
        })
      : null;

  const ghost =
    "btn-press inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-semibold transition-colors";

  return (
    <div className="space-y-5">
      {event ? <AddToCalendar bare event={event} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {t ? (
          <button
            type="button"
            onClick={() => setChanging((c) => !c)}
            aria-expanded={changing}
            className={cx(ghost, "text-clay hover:bg-clay-wash")}
          >
            {changing ? "Close" : "Change"}
          </button>
        ) : null}

        {t ? (
          confirmCancel ? (
            <form action={cancelDgroupBooking} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              <span className="text-[0.95rem] text-ink-soft">Cancel this table?</span>
              <button type="submit" className={cx(ghost, "bg-sky-wash text-sky")}>
                Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className={cx(ghost, "text-ink-mute")}>
                Keep it
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className={cx(ghost, "text-ink-mute hover:bg-rule hover:text-ink")}
            >
              Cancel
            </button>
          )
        ) : r && (r.status === "pending" || r.status === "approved") ? (
          <CancelButton id={r.id} />
        ) : null}

        {t ? <BookAgain id={t.id} target={rebookTarget} /> : null}
      </div>

      {t && changing ? (
        <ChangeForm id={t.id} date={t.booked_on} slotId={t.slot_id} groupSize={t.group_size} nights={nights} />
      ) : null}
    </div>
  );
}

/** "HH:MM" in Manila for a UTC ISO time. */
function minutesToHHMM(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString().slice(11, 16);
}

/** Move a Dgroup table to another open day or time, or change the headcount. */
function ChangeForm({
  id,
  date: initialDate,
  slotId,
  groupSize,
  nights,
}: {
  id: string;
  date: string;
  slotId: string;
  groupSize: number;
  nights: NightOption[];
}) {
  const [state, action, pending] = useActionState<DgroupChangeResult | null, FormData>(changeDgroupBooking, null);
  // Only days still open can be chosen; start on the booking's own day if it is.
  const [date, setDate] = useState(
    nights.some((n) => n.date === initialDate) ? initialDate : (nights[0]?.date ?? ""),
  );
  const slots = nights.find((n) => n.date === date)?.slots ?? [];
  const [slot, setSlot] = useState(slots.some((s) => s.id === slotId) ? slotId : (slots[0]?.id ?? ""));
  const [count, setCount] = useState(String(groupSize));
  const people = /^\d+$/.test(count) ? Number(count) : 0;
  const e = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-clay-wash px-5 py-4 text-[1rem] text-clay-deep">
        Updated: {state.summary}. We&rsquo;ve emailed you the new details.
      </p>
    );
  }

  if (!nights.length) {
    return (
      <p className="rounded-2xl bg-mist px-5 py-4 text-[0.98rem] text-ink-mute">
        There are no open days to move to right now. Next week opens on Sunday.
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-6 rounded-2xl bg-mist p-5 sm:p-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="id" value={id} />

      <fieldset>
        <legend className="text-[1rem] font-semibold text-ink">Day</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {nights.map((n) => (
            <label key={n.date} className={calmChipClass(date === n.date)}>
              <input
                type="radio"
                name="date"
                value={n.date}
                checked={date === n.date}
                onChange={() => {
                  setDate(n.date);
                  if (!n.slots.some((s) => s.id === slot)) setSlot(n.slots[0]?.id ?? "");
                }}
                className="sr-only"
              />
              {shortNight(n.label)}
            </label>
          ))}
        </div>
        <FieldError text={e.date} />
      </fieldset>

      <fieldset>
        <legend className="text-[1rem] font-semibold text-ink">Time</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((s) => (
            <label key={s.id} className={calmChipClass(slot === s.id)}>
              <input
                type="radio"
                name="slot"
                value={s.id}
                checked={slot === s.id}
                onChange={() => setSlot(s.id)}
                className="sr-only"
              />
              {s.label}
            </label>
          ))}
        </div>
        <FieldError text={e.slotId} />
      </fieldset>

      <div>
        <p id={`count-${id}`} className="text-[1rem] font-semibold text-ink">
          How many people?
        </p>
        <div className="mt-3 flex items-center gap-4">
          <StepButton label="One fewer" disabled={people <= 1} onClick={() => setCount(String(Math.max(1, people - 1)))}>
            −
          </StepButton>
          <input
            name="group_size"
            aria-labelledby={`count-${id}`}
            inputMode="numeric"
            maxLength={2}
            value={count}
            onChange={(ev) => setCount(ev.target.value.replace(/\D/g, ""))}
            className={cx(countInputClass, "bg-paper-bright")}
          />
          <StepButton
            label="One more"
            disabled={people >= MAX_GROUP_SIZE}
            onClick={() => setCount(String(Math.min(MAX_GROUP_SIZE, people + 1)))}
          >
            +
          </StepButton>
        </div>
        <FieldError text={e.groupSize} />
      </div>

      {state?.formError ? (
        <p role="alert" className="rounded-2xl bg-sky-wash px-5 py-4 text-[0.98rem] font-semibold text-sky">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-press inline-flex min-h-12 items-center rounded-full bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
