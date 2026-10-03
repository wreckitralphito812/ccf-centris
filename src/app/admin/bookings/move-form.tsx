"use client";

import { useActionState, useState } from "react";
import { adminMoveDgroupBooking, type ToolResult } from "@/app/actions/admin-tools";
import { cx } from "@/components/ui";
import { DGROUP_SLOTS } from "@/lib/dgroup-tables";

/** Move a Dgroup booking to another weekday and time; tables are reassigned. */
export function MoveForm({ id, date, slot, today }: { id: string; date: string; slot: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ToolResult | null, FormData>(adminMoveDgroupBooking, null);

  if (state?.ok) return <p className="text-[0.85rem] font-semibold text-moss">{state.message}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="label text-clay hover:text-clay-deep">
        Move
      </button>
    );
  }
  const input = "calm-input min-h-10 px-3 text-[0.9rem] text-ink";
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="sr-only">New day</span>
        <input type="date" name="date" min={today} defaultValue={date < today ? today : date} required className={input} />
      </label>
      <label className="block">
        <span className="sr-only">New time</span>
        <select name="slot" defaultValue={slot} className={input}>
          {DGROUP_SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-press min-h-10 rounded-lg bg-clay px-4 text-[0.88rem] font-semibold text-paper-bright hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Moving…" : "Move"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-10 px-2 text-[0.88rem] font-semibold text-ink-mute">
        Cancel
      </button>
      {state?.formError ? <p className={cx("w-full text-[0.85rem] font-semibold text-sky")}>{state.formError}</p> : null}
    </form>
  );
}
