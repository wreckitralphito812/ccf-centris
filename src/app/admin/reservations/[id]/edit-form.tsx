"use client";

import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateRoomRequest, type RoomEditResult } from "@/app/actions/admin";
import { controlClass } from "@/components/form";
import { cx } from "@/components/ui";
import { EDIT_ROOMS, EDIT_TIMES, type RoomRequestDetails } from "@/lib/room-edit";
import { EQUIPMENT, FOOD, SETUPS, TABLE_KINDS, timeLabel, toMinutes } from "@/lib/ministry-rooms";

/**
 * Change a room request (Adrian, 2026-10-16): everything the ministry asked
 * for, laid out the way they filled it in. Saving emails them what changed,
 * unless the box at the bottom is unticked.
 */
export function RoomEditForm({ id, initial }: { id: string; initial: RoomRequestDetails }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RoomEditResult | null, FormData>(async (prev, fd) => {
    const res = await adminUpdateRoomRequest(prev, fd);
    if (res.ok && res.id && res.id !== id) router.replace(`/admin/reservations/${res.id}`);
    return res;
  }, null);
  const [layout, setLayout] = useState(initial.layout);
  const label = "block text-[0.9rem] font-semibold text-ink";
  const box = "rounded-xl border border-hairline bg-paper-bright p-5 sm:p-6";

  return (
    // Submitted by hand, not through `action`, so React doesn't clear the
    // form afterwards: on an error the admin's changes stay put to fix.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-5"
    >
      <input type="hidden" name="id" value={id} />

      <section className={box}>
        <h2 className="text-[1.1rem] font-semibold text-ink">Rooms and time</h2>
        <fieldset className="mt-4">
          <legend className={label}>Rooms</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {EDIT_ROOMS.map((r) => (
              <label key={r.slug} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-edge px-3 has-[:checked]:border-clay has-[:checked]:bg-clay/10">
                <input type="checkbox" name="room" value={r.slug} defaultChecked={initial.rooms.includes(r.slug)} className="h-4 w-4 accent-[var(--color-clay)]" />
                <span className="text-[0.95rem]">{r.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label>
            <span className={label}>Day</span>
            <input type="date" name="date" defaultValue={initial.date} required className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>From</span>
            <select name="start" defaultValue={initial.start} className={cx(controlClass, "mt-1.5")}>
              {EDIT_TIMES.slice(0, -1).map((t) => (
                <option key={t} value={t}>
                  {timeLabel(toMinutes(t))}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Until</span>
            <select name="end" defaultValue={initial.end} className={cx(controlClass, "mt-1.5")}>
              {EDIT_TIMES.slice(1).map((t) => (
                <option key={t} value={t}>
                  {timeLabel(toMinutes(t))}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={box}>
        <h2 className="text-[1.1rem] font-semibold text-ink">The event</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Event name</span>
            <input name="activity_name" defaultValue={initial.activity_name} maxLength={120} required className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>Ministry</span>
            <input name="organization" defaultValue={initial.organization} maxLength={80} className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>People</span>
            <input type="number" name="participants" min={1} max={2000} defaultValue={initial.participants} required className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>Set-up</span>
            <select name="layout" value={layout} onChange={(e) => setLayout(e.target.value)} className={cx(controlClass, "mt-1.5")}>
              <option value="">Not said</option>
              {SETUPS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {layout === "tables" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {TABLE_KINDS.map((k) => (
              <label key={k.id}>
                <span className={label}>
                  {k.label} tables <span className="font-normal text-ink-mute">(seat {k.seats}, {k.stock} in all)</span>
                </span>
                <input type="number" name={`tables_${k.id}`} min={0} max={k.stock} defaultValue={initial.tables[k.id] ?? 0} className={cx(controlClass, "mt-1.5")} />
              </label>
            ))}
          </div>
        ) : null}
        <fieldset className="mt-4">
          <legend className={label}>Equipment</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {EQUIPMENT.map((e) => (
              <label key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-edge px-3 py-2">
                <span className="text-[0.92rem]">{e.label}</span>
                <input
                  type="number"
                  name={`eq_${e.id}`}
                  min={0}
                  max={e.max}
                  defaultValue={initial.equipment[e.id] ?? 0}
                  aria-label={`${e.label}, up to ${e.max}`}
                  className="w-16 rounded-md bg-mist px-2 py-1.5 text-right"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Food</span>
            <select name="food" defaultValue={initial.food} className={cx(controlClass, "mt-1.5")}>
              <option value="">Not said</option>
              {FOOD.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Notes</span>
            <textarea name="purpose" defaultValue={initial.purpose} maxLength={1000} rows={2} className={cx(controlClass, "mt-1.5")} />
          </label>
        </div>
      </section>

      <section className={box}>
        <h2 className="text-[1.1rem] font-semibold text-ink">Who asked</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label>
            <span className={label}>Name</span>
            <input name="contact_name" defaultValue={initial.contact_name} maxLength={120} required className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>Email</span>
            <input type="email" name="contact_email" defaultValue={initial.contact_email} maxLength={200} required className={cx(controlClass, "mt-1.5")} />
          </label>
          <label>
            <span className={label}>Mobile</span>
            <input name="contact_mobile" defaultValue={initial.contact_mobile} maxLength={30} className={cx(controlClass, "mt-1.5")} />
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-paper-bright/95 px-5 py-4 shadow-lg backdrop-blur">
        <label className="flex items-center gap-2.5 text-[0.95rem]">
          <input type="checkbox" name="notify" value="1" defaultChecked className="h-4 w-4 accent-[var(--color-clay)]" />
          Email {initial.contact_name.split(" ")[0] || "the requester"} what changed
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-press ml-auto inline-flex min-h-11 items-center rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state ? (
          <div role="status" className="w-full text-[0.95rem]">
            {!state.ok ? (
              <p className="font-semibold text-clay-deep">{state.formError}</p>
            ) : state.changes?.length ? (
              <div className="text-moss">
                <p className="font-semibold">
                  Saved.{" "}
                  {state.emailed ? `${initial.contact_name.split(" ")[0]} was emailed these changes:` : "No email was sent. Changes:"}
                </p>
                <ul className="mt-1 list-disc pl-5 text-ink-soft">
                  {state.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-ink-mute">Nothing was changed.</p>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}
