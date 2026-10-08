"use client";

import { useActionState, useState } from "react";
import { addRoomBlock, addTableBlock, type ToolResult } from "@/app/actions/admin-tools";
import { cx } from "@/components/ui";
import { DGROUP_ROOMS, DGROUP_SLOTS } from "@/lib/dgroup-tables";
import { MINISTRY_ROOMS } from "@/lib/ministry-rooms";
import { keepForm } from "@/lib/keep-form";

const INPUT = "calm-input min-h-11 w-full px-3.5 text-[0.95rem] text-ink";
const LABEL = "block text-[0.88rem] font-semibold text-ink";
const SUBMIT =
  "btn-press min-h-11 rounded-lg bg-clay px-5 text-[0.95rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50";

function Result({ state }: { state: ToolResult | null }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cx("mt-3 text-[0.92rem] font-semibold", state.ok ? "text-moss" : "text-sky")}
    >
      {state.ok ? state.message : state.formError}
    </p>
  );
}

/** Block one table, a whole room, or both rooms, for one slot or the whole day. */
export function TableBlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ToolResult | null, FormData>(addTableBlock, null);
  const [room, setRoom] = useState("dgroup-lounge");
  const tables = DGROUP_ROOMS.find((r) => r.slug === room)?.tables ?? [];

  return (
    <form action={action} onSubmit={keepForm(action)} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={LABEL}>Room</span>
          <select name="room" value={room} onChange={(e) => setRoom(e.target.value)} className={cx(INPUT, "mt-1.5")}>
            {DGROUP_ROOMS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
            <option value="all">Both rooms</option>
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Tables</span>
          <select name="table" disabled={room === "all"} className={cx(INPUT, "mt-1.5")} defaultValue="">
            <option value="">Every table</option>
            {tables.map((t) => (
              <option key={t.label} value={t.label}>
                Table {t.label} ({t.seats} seats)
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Day</span>
          <input type="date" name="date" min={today} defaultValue={today} required className={cx(INPUT, "mt-1.5")} />
        </label>
        <label className="block">
          <span className={LABEL}>Time</span>
          <select name="slot" className={cx(INPUT, "mt-1.5")} defaultValue="">
            <option value="">All day</option>
            {DGROUP_SLOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={LABEL}>
          Reason <span className="font-normal text-ink-mute">(staff only)</span>
        </span>
        <input name="reason" maxLength={200} placeholder="e.g. Repairs, Leaders' summit" className={cx(INPUT, "mt-1.5")} />
      </label>
      <button type="submit" disabled={pending} className={SUBMIT}>
        {pending ? "Blocking…" : "Block tables"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Block a ministry room for a stretch of one day. */
export function RoomBlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ToolResult | null, FormData>(addRoomBlock, null);
  return (
    <form action={action} onSubmit={keepForm(action)} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={LABEL}>Room</span>
          <select name="room" className={cx(INPUT, "mt-1.5")} defaultValue={MINISTRY_ROOMS[0].slug}>
            {MINISTRY_ROOMS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Day</span>
          <input type="date" name="date" min={today} defaultValue={today} required className={cx(INPUT, "mt-1.5")} />
        </label>
        <label className="block">
          <span className={LABEL}>From</span>
          <input type="time" name="start" defaultValue="09:00" step={1800} required className={cx(INPUT, "mt-1.5")} />
        </label>
        <label className="block">
          <span className={LABEL}>Until</span>
          <input type="time" name="end" defaultValue="21:30" step={1800} required className={cx(INPUT, "mt-1.5")} />
        </label>
      </div>
      <label className="block">
        <span className={LABEL}>
          Reason <span className="font-normal text-ink-mute">(staff only)</span>
        </span>
        <input name="reason" maxLength={200} placeholder="e.g. Deep cleaning, Church-wide event" className={cx(INPUT, "mt-1.5")} />
      </label>
      <button type="submit" disabled={pending} className={SUBMIT}>
        {pending ? "Blocking…" : "Block room"}
      </button>
      <Result state={state} />
    </form>
  );
}
