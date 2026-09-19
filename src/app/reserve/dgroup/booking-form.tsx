"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { reserveDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { DGROUP_POLICIES, MAX_GROUP_SIZE } from "@/lib/dgroup-tables";

export interface NightOption {
  date: string;
  label: string;
  slots: { id: string; label: string }[];
}

export const inputClass =
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[1rem] text-ink focus:border-clay";

/** The form, remounted fresh for each new booking after a confirmation. */
export function BookingForm({
  nights,
  email,
  name = "",
  mobile = "",
}: {
  nights: NightOption[];
  email: string;
  name?: string;
  mobile?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <BookingAttempt
      key={attempt}
      nights={nights}
      email={email}
      name={name}
      mobile={mobile}
      onAnother={() => setAttempt((a) => a + 1)}
    />
  );
}

function BookingAttempt({
  nights,
  email,
  name,
  mobile,
  onAnother,
}: {
  nights: NightOption[];
  email: string;
  name: string;
  mobile: string;
  onAnother: () => void;
}) {
  const [state, action, pending] = useActionState<DgroupBookingResult | null, FormData>(
    reserveDgroupTable,
    null,
  );
  const [date, setDate] = useState(nights[0]?.date ?? "");
  const slots = nights.find((n) => n.date === date)?.slots ?? [];
  const e = state?.fieldErrors ?? {};

  if (state?.ok && state.booking) {
    const b = state.booking;
    return (
      <div role="status" className="border border-clay bg-paper-bright p-7">
        <p className="label text-clay">You&rsquo;re booked</p>
        <p className="font-display mt-3 text-4xl leading-tight text-ink">{b.tables}</p>
        <p className="mt-1 text-lg text-ink-soft">{b.roomName}</p>
        <p className="mt-4 text-lg text-ink">
          {b.night}, {b.slot} · {b.groupSize} {b.groupSize === 1 ? "person" : "people"}
        </p>
        <div className="mt-6 max-w-sm">
          <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={320} />
        </div>
        <p className="mt-6 border-t border-hairline pt-4 text-[0.9rem] leading-relaxed text-ink-soft">
          {b.emailed
            ? `We've emailed the details to ${b.email}.`
            : `We couldn't send the confirmation email to ${b.email} just now, but your booking is saved. You'll find it under “Your bookings” on this page.`}{" "}
          You can change the headcount or time, or cancel, from this page.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <button
            type="button"
            onClick={onAnother}
            className="label text-clay underline underline-offset-4 hover:text-clay-deep"
          >
            Book another slot
          </button>
          <a href="/reserve/dgroup#your-tables" className="label text-clay underline underline-offset-4">
            See your bookings
          </a>
        </div>
      </div>
    );
  }

  if (!nights.length) {
    return (
      <p className="border border-dashed border-hairline p-8 text-center text-ink-mute">
        No slots are open right now. Next week&rsquo;s days open on Sunday.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-7">
      <Field label="Day" error={e.date}>
        <select name="date" value={date} onChange={(ev) => setDate(ev.target.value)} className={inputClass}>
          {nights.map((n) => (
            <option key={n.date} value={n.date}>
              {n.label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset key={date}>
        <legend className="label text-clay">Time slot</legend>
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
        {e.slotId ? <Err>{e.slotId}</Err> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dleader name" error={e.leaderName}>
          <input name="leader_name" required autoComplete="name" defaultValue={name} className={inputClass} />
        </Field>
        <Field label="Dleader contact number" error={e.contactMobile}>
          <input
            name="contact_mobile"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            defaultValue={mobile}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dleader email" error={e.leaderEmail} hint="Your table number is sent here.">
          <input
            name="leader_email"
            type="email"
            required
            autoComplete="email"
            defaultValue={email}
            className={inputClass}
          />
        </Field>
        <Field
          label="How many are coming?"
          error={e.groupSize}
          hint={`Including you. Up to ${MAX_GROUP_SIZE}.`}
        >
          <input
            name="group_size"
            type="number"
            min={1}
            max={MAX_GROUP_SIZE}
            required
            inputMode="numeric"
            className={`${inputClass} max-w-[8rem]`}
          />
        </Field>
      </div>

      <fieldset className="border border-hairline bg-paper-bright p-5">
        <legend className="label px-1 text-clay">Policies</legend>
        <p className="text-[0.9rem] text-ink-soft">
          Accept each one on behalf of your Dgroup to confirm the booking.
        </p>
        <ul className="mt-4 space-y-3">
          {DGROUP_POLICIES.map((p) => (
            <li key={p.id}>
              <label className="flex items-start gap-3 text-[0.92rem] leading-relaxed text-ink-soft">
                <input type="checkbox" name={`policy_${p.id}`} required className="mt-1 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-semibold text-ink">{p.title}.</span> {p.body}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {e.policies ? <Err>{e.policies}</Err> : null}
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
        {pending ? "Assigning your table…" : "Confirm booking"}
      </button>
    </form>
  );
}

export function Err({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-[0.85rem] text-sky">
      {children}
    </p>
  );
}

export function Field({
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
