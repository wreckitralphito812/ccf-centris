"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import {
  cancelDgroupBooking,
  changeDgroupBooking,
  type DgroupChangeResult,
} from "@/app/actions/dgroup-tables";
import { Chip, ChoiceGroup } from "@/components/booking";
import { Field, controlClass } from "@/components/form";
import { MAX_GROUP_SIZE, type NightOption } from "@/lib/dgroup-tables";
import { shortNight } from "./booking-form";

/**
 * One of the member's upcoming Dgroup tables: what and when up front, the
 * floor plan and the change form a tap away, and cancel with a confirm.
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
  const [open, setOpen] = useState<"plan" | "change" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const toggle = (p: "plan" | "change") => setOpen((o) => (o === p ? null : p));

  const link = "label text-clay underline underline-offset-4 hover:text-clay-deep";

  return (
    <li className="surface p-5">
      <p className="label text-clay">Dgroup table</p>
      <p className="font-display mt-1 text-2xl text-ink">{title}</p>
      <p className="mt-1 text-[0.95rem] text-ink-soft">
        {when} · {groupSize} {groupSize === 1 ? "person" : "people"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={() => toggle("plan")} aria-expanded={open === "plan"} className={link}>
          {open === "plan" ? "Hide floor plan" : "Floor plan"}
        </button>
        <button type="button" onClick={() => toggle("change")} aria-expanded={open === "change"} className={link}>
          {open === "change" ? "Close" : "Change"}
        </button>
        {confirmCancel ? (
          <form action={cancelDgroupBooking} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <span className="text-[0.9rem] text-ink-soft">Cancel this booking?</span>
            <button type="submit" className="label text-clay-deep underline underline-offset-4">
              Yes, cancel
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className="label text-ink-mute">
              Keep it
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="label text-ink-mute transition-colors hover:text-clay-deep"
          >
            Cancel
          </button>
        )}
      </div>

      {open === "plan" ? <div className="mt-5 max-w-xs border-t border-hairline pt-5">{plan}</div> : null}
      {open === "change" ? (
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
  const [date, setDate] = useState(
    nights.some((n) => n.date === initialDate) ? initialDate : (nights[0]?.date ?? ""),
  );
  const slots = nights.find((n) => n.date === date)?.slots ?? [];
  const [slot, setSlot] = useState(
    slots.some((s) => s.id === slotId) ? slotId : (slots[0]?.id ?? ""),
  );
  const e = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <p role="status" className="mt-5 border-t border-hairline pt-4 text-[0.95rem] text-ink">
        Updated: {state.summary}. We&rsquo;ve emailed you the new details.
      </p>
    );
  }

  if (!nights.length) {
    return (
      <p className="mt-5 border-t border-hairline pt-4 text-[0.92rem] text-ink-mute">
        There are no open days to move to right now. Next week opens on Sunday.
      </p>
    );
  }

  return (
    <form
      noValidate
      className="mt-5 space-y-6 border-t border-hairline pt-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot} />

      <ChoiceGroup legend="Day" error={e.date}>
        {nights.map((n) => (
          <Chip
            key={n.date}
            on={date === n.date}
            onClick={() => {
              setDate(n.date);
              if (!n.slots.some((s) => s.id === slot)) setSlot(n.slots[0]?.id ?? "");
            }}
          >
            {shortNight(n.label)}
          </Chip>
        ))}
      </ChoiceGroup>

      <ChoiceGroup legend="Time" error={e.slotId}>
        {slots.map((s) => (
          <Chip key={s.id} on={slot === s.id} onClick={() => setSlot(s.id)}>
            {s.label}
          </Chip>
        ))}
      </ChoiceGroup>

      <Field label="How many?" name="group_size" hint={`Up to ${MAX_GROUP_SIZE}.`} error={e.groupSize}>
        {(p) => (
          <input
            {...p}
            type="number"
            min={1}
            max={MAX_GROUP_SIZE}
            inputMode="numeric"
            defaultValue={groupSize}
            className={`${controlClass} max-w-28`}
          />
        )}
      </Field>

      {state?.formError ? (
        <p role="alert" className="border-l-2 border-clay pl-4 text-[0.95rem] font-semibold text-clay-deep">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-press label rounded-full border border-clay bg-clay px-5 py-3 text-paper-bright hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
