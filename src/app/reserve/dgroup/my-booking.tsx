"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  cancelDgroupBooking,
  changeDgroupBooking,
  type DgroupChangeResult,
} from "@/app/actions/dgroup-tables";
import { MAX_GROUP_SIZE } from "@/lib/dgroup-tables";
import { Err, Field, inputClass, type NightOption } from "./booking-form";

/**
 * One of the member's upcoming bookings: its tables and plan, and ways to
 * change the headcount or time, or cancel.
 */
export function MyBooking({
  id,
  title,
  when,
  groupSize,
  date,
  slotId,
  nights,
  plan,
}: {
  id: string;
  title: string;
  when: string;
  groupSize: number;
  date: string;
  slotId: string;
  nights: NightOption[];
  plan: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <li className="border border-hairline bg-paper-bright p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-display text-2xl text-ink">{title}</p>
          <p className="mt-1 text-[0.95rem] text-ink-soft">
            {when} · {groupSize} {groupSize === 1 ? "person" : "people"}
          </p>
          <div className="mt-4 flex flex-wrap gap-5">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              className="label text-clay underline underline-offset-4"
            >
              {editing ? "Close" : "Change"}
            </button>
            {confirmCancel ? (
              <form action={cancelDgroupBooking} className="flex items-center gap-3">
                <input type="hidden" name="id" value={id} />
                <span className="text-[0.9rem] text-ink-soft">Cancel this booking?</span>
                <button type="submit" className="label text-sky underline underline-offset-4">
                  Yes, cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="label text-ink-mute"
                >
                  Keep it
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="label text-ink-mute transition-colors hover:text-sky"
              >
                Cancel booking
              </button>
            )}
          </div>
        </div>
        <div className="w-[220px] shrink-0">{plan}</div>
      </div>
      {editing ? (
        <ChangeForm id={id} date={date} slotId={slotId} groupSize={groupSize} nights={nights} />
      ) : null}
    </li>
  );
}

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
  const [state, action, pending] = useActionState<DgroupChangeResult | null, FormData>(
    changeDgroupBooking,
    null,
  );
  // Only days still open can be chosen; start on the booking's own day if it is.
  const days = nights;
  const [date, setDate] = useState(
    days.some((n) => n.date === initialDate) ? initialDate : (days[0]?.date ?? ""),
  );
  const slots = days.find((n) => n.date === date)?.slots ?? [];
  const e = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <p role="status" className="mt-5 border-t border-hairline pt-4 text-[0.95rem] text-ink">
        Updated: {state.summary}. We&rsquo;ve emailed you the new details.
      </p>
    );
  }

  return (
    <form action={action} className="mt-5 space-y-5 border-t border-hairline pt-5">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <Field label="Day" error={e.date}>
          <select name="date" value={date} onChange={(ev) => setDate(ev.target.value)} className={inputClass}>
            {days.map((n) => (
              <option key={n.date} value={n.date}>
                {n.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How many?" error={e.groupSize}>
          <input
            name="group_size"
            type="number"
            min={1}
            max={MAX_GROUP_SIZE}
            defaultValue={groupSize}
            required
            className={`${inputClass} max-w-[7rem]`}
          />
        </Field>
      </div>
      <fieldset key={date}>
        <legend className="label text-clay">Time slot</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {slots.map((s, i) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2.5 border border-hairline bg-paper px-4 py-2.5 text-ink has-[:checked]:border-clay has-[:checked]:text-clay"
            >
              <input
                type="radio"
                name="slot"
                value={s.id}
                defaultChecked={slots.some((x) => x.id === slotId) ? s.id === slotId : i === 0}
                required
              />
              {s.label}
            </label>
          ))}
        </div>
        {e.slotId ? <Err>{e.slotId}</Err> : null}
      </fieldset>
      {state?.formError ? (
        <p role="alert" className="border-l-2 border-sky pl-4 text-[0.95rem] text-sky">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-press label border border-clay bg-clay px-5 py-3 text-paper-bright hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
