"use client";

import { useActionState, useState } from "react";
import { closeRoomsAndTables, type ToolResult } from "@/app/actions/admin-tools";
import { cx } from "@/components/ui";
import { DGROUP_ROOMS } from "@/lib/dgroup-tables";
import { BOARD_ROOMS } from "@/lib/admin-day";
import { keepForm } from "@/lib/keep-form";

const INPUT = "calm-input min-h-11 w-full px-3.5 text-[0.95rem] text-ink";
const LABEL = "block text-[0.88rem] font-semibold text-ink";
const SUBMIT =
  "btn-press min-h-11 rounded-lg bg-clay px-5 text-[0.95rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50";

/** A tick as a chip: teal when on, like the choices in the booking forms. */
function Tick({ name, value, label, on, onChange, disabled }: { name: string; value: string; label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label
      className={cx(
        "inline-flex min-h-10 items-center rounded-lg border px-3.5 text-[0.92rem] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
        disabled
          ? "cursor-not-allowed border-rule bg-mist text-ink-mute"
          : on
            ? "cursor-pointer border-clay bg-clay font-semibold text-paper-bright"
            : "cursor-pointer border-edge bg-paper-bright text-ink hover:border-clay/50",
      )}
    >
      <input type="checkbox" name={name} value={value} checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}

/**
 * Close rooms and Dgroup tables, as many as needed, from one day and time
 * until another (Adrian, 2026-11-14). Replaces the separate one-room and
 * one-table forms.
 */
export function CloseForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ToolResult | null, FormData>(closeRoomsAndTables, null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const toggle = (list: string[], set: (v: string[]) => void, v: string, on: boolean) =>
    set(on ? [...list, v] : list.filter((x) => x !== v));

  return (
    <form action={action} onSubmit={keepForm(action)} className="space-y-6 p-5">
      <fieldset>
        <legend className={LABEL}>Rooms</legend>
        <p className="mt-0.5 text-[0.85rem] text-ink-mute">Nobody can request these rooms then. Events stay as they are.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {BOARD_ROOMS.map((r) => (
            <Tick key={r.slug} name="room" value={r.slug} label={r.name} on={rooms.includes(r.slug)} onChange={(on) => toggle(rooms, setRooms, r.slug, on)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>Dgroup tables</legend>
        <p className="mt-0.5 text-[0.85rem] text-ink-mute">
          Members see these as taken. Tables are only booked Tuesday to Friday, 1:00 to 9:30 PM, so other days and hours are skipped.
        </p>
        <div className="mt-2.5 space-y-3">
          {DGROUP_ROOMS.map((r) => {
            const all = tables.includes(`${r.slug}:*`);
            return (
              <div key={r.slug}>
                <p className="text-[0.88rem] font-semibold text-ink-soft">{r.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Tick name="table" value={`${r.slug}:*`} label="Every table" on={all} onChange={(on) => toggle(tables, setTables, `${r.slug}:*`, on)} />
                  {r.tables.map((t) => (
                    <Tick
                      key={t.label}
                      name="table"
                      value={`${r.slug}:${t.label}`}
                      label={`Table ${t.label}`}
                      on={all || tables.includes(`${r.slug}:${t.label}`)}
                      disabled={all}
                      onChange={(on) => toggle(tables, setTables, `${r.slug}:${t.label}`, on)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={LABEL}>From (day)</span>
          <input
            type="date"
            name="from_date"
            min={today}
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              if (toDate < e.target.value) setToDate(e.target.value);
            }}
            required
            className={cx(INPUT, "mt-1.5")}
          />
        </label>
        <label className="block">
          <span className={LABEL}>From (time)</span>
          <input type="time" name="from_time" defaultValue="09:00" step={1800} required className={cx(INPUT, "mt-1.5")} />
        </label>
        <label className="block">
          <span className={LABEL}>Until (day)</span>
          <input type="date" name="to_date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} required className={cx(INPUT, "mt-1.5")} />
        </label>
        <label className="block">
          <span className={LABEL}>Until (time)</span>
          <input type="time" name="to_time" defaultValue="21:30" step={1800} required className={cx(INPUT, "mt-1.5")} />
        </label>
      </div>

      <label className="block">
        <span className={LABEL}>
          Reason <span className="font-normal text-ink-mute">(staff only)</span>
        </span>
        <input name="reason" maxLength={200} placeholder="e.g. Repairs, Leaders' summit, Deep cleaning" className={cx(INPUT, "mt-1.5")} />
      </label>

      <button type="submit" disabled={pending || (!rooms.length && !tables.length)} className={SUBMIT}>
        {pending ? "Saving…" : "Close them"}
      </button>
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={cx("text-[0.92rem] font-semibold", state.ok ? "text-moss" : "text-sky")}>
          {state.ok ? state.message : state.formError}
        </p>
      ) : null}
    </form>
  );
}
