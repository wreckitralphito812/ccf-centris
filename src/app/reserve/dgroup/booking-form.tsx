"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { reserveDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import { DGROUP_ROOMS, HOUSE_RULES, MAX_GROUP_SIZE } from "@/lib/dgroup-tables";

export interface NightOption {
  date: string;
  label: string;
  slots: { id: string; label: string }[];
}

const input =
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[1rem] text-ink focus:border-clay";

/** The form, remounted fresh for each new booking after a confirmation. */
export function BookingForm({ nights }: { nights: NightOption[] }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <BookingAttempt key={attempt} nights={nights} onAnother={() => setAttempt((a) => a + 1)} />
  );
}

function BookingAttempt({ nights, onAnother }: { nights: NightOption[]; onAnother: () => void }) {
  const [state, action, pending] = useActionState<DgroupBookingResult | null, FormData>(
    reserveDgroupTable,
    null,
  );
  const [date, setDate] = useState(nights[0]?.date ?? "");
  const slots = nights.find((n) => n.date === date)?.slots ?? [];
  const e = state?.fieldErrors ?? {};

  if (state?.ok && state.booking) {
    // The table is assigned and held at this point, but deliberately not
    // named: the request still needs an admin's approval, and a number here
    // would read as settled. It appears under "Your tables" once approved.
    const b = state.booking;
    return (
      <div role="status" className="border border-clay bg-paper-bright p-7">
        <p className="label text-clay">Request received</p>
        <p className="font-display mt-3 text-3xl leading-tight text-ink">
          We&rsquo;re holding a table for {b.seats} in the {b.roomName}.
        </p>
        <p className="mt-3 text-lg text-ink">
          {b.night}, {b.slot}
        </p>
        <p className="mt-5 border-t border-hairline pt-4 text-[0.88rem] leading-relaxed text-ink-mute">
          A Centris admin reviews this and your table number appears under
          &ldquo;Your tables&rdquo; below once it&rsquo;s approved. Nothing is
          emailed or texted yet, so check back here.
        </p>
        <button
          type="button"
          onClick={onAnother}
          className="label mt-5 text-clay underline underline-offset-4 hover:text-clay-deep"
        >
          Request another table
        </button>
      </div>
    );
  }

  if (!nights.length) {
    return (
      <p className="border border-dashed border-hairline p-8 text-center text-ink-mute">
        No nights are open for booking right now. Check back soon.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Night" error={e.date}>
          <select
            name="date"
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
            className={input}
          >
            {nights.map((n) => (
              <option key={n.date} value={n.date}>
                {n.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room" error={e.room}>
          <select name="room" defaultValue="either" className={input}>
            <option value="either">Either room</option>
            {DGROUP_ROOMS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset key={date}>
        <legend className="label text-clay">Time</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {slots.map((s, i) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2.5 border border-hairline bg-paper-bright px-4 py-3 text-ink has-[:checked]:border-clay has-[:checked]:text-clay"
            >
              <input type="radio" name="slot" value={s.id} defaultChecked={i === 0} required />
              {s.label}
            </label>
          ))}
        </div>
        {e.slotId ? (
          <p role="alert" className="mt-1.5 text-[0.85rem] text-sky">
            {e.slotId}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dgroup leader" error={e.leaderName}>
          <input name="leader_name" required autoComplete="name" className={input} />
        </Field>
        <Field label="Contact number" error={e.contactMobile}>
          <input
            name="contact_mobile"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            className={input}
          />
        </Field>
      </div>

      <Field label="How many are coming?" error={e.groupSize} hint={`Up to ${MAX_GROUP_SIZE} at one table.`}>
        <input
          name="group_size"
          type="number"
          min={1}
          max={MAX_GROUP_SIZE}
          required
          inputMode="numeric"
          className={`${input} max-w-[8rem]`}
        />
      </Field>

      <fieldset className="border border-hairline bg-paper-bright p-5">
        <legend className="label px-1 text-clay">House rules</legend>
        <ul className="space-y-3">
          {HOUSE_RULES.map((r) => (
            <li key={r.id} className="text-[0.9rem] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{r.title}.</span> {r.body}
            </li>
          ))}
        </ul>
        <label className="mt-5 flex items-start gap-3 text-[0.95rem] text-ink">
          <input type="checkbox" name="agree" required className="mt-1 h-4 w-4" />
          I agree to the house rules on behalf of my Dgroup.
        </label>
        {e.agree ? (
          <p role="alert" className="mt-1.5 text-[0.85rem] text-sky">
            {e.agree}
          </p>
        ) : null}
      </fieldset>

      {state?.formError ? (
        <p role="alert" className="border-l-2 border-sky pl-4 text-[0.95rem] text-sky">
          {state.formError}
          {state.needsAuth ? (
            <>
              {" "}
              <Link href="/sign-in?next=/reserve/dgroup" className="underline underline-offset-4">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-press label border border-clay bg-clay px-6 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Finding a table…" : "Reserve a table"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label text-clay">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[0.82rem] text-ink-mute">{hint}</span> : null}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[0.85rem] text-sky">
          {error}
        </span>
      ) : null}
    </label>
  );
}
