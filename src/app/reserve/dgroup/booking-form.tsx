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

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-05" → { weekday: "Mon", day: 5, month: "Oct" }, read as a calendar date. */
function dayParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { weekday: WEEKDAY[wd], day: d, month: MONTH[m - 1] };
}

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

/**
 * One booking, top to bottom: day, time, headcount, the leader's details, the
 * policies. Choices are tap targets rather than dropdowns, so every option is
 * visible at once, and a summary beside the form (below it on phones) keeps
 * the booking in view next to the button that confirms it.
 */
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
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [size, setSize] = useState(4);
  const [agreed, setAgreed] = useState(false);
  const e = state?.fieldErrors ?? {};

  const pickDate = (d: string) => {
    setDate(d);
    const next = nights.find((n) => n.date === d)?.slots ?? [];
    if (!next.some((s) => s.id === slotId)) setSlotId(next[0]?.id ?? "");
  };

  if (state?.ok && state.booking) {
    const b = state.booking;
    return (
      <div role="status" className="border border-clay bg-paper-bright">
        <div className="grid gap-8 p-7 sm:p-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
          <div>
            <p className="label text-clay">You&rsquo;re booked</p>
            <p className="font-display mt-3 text-4xl leading-tight text-ink">{b.tables}</p>
            <p className="mt-1 text-lg text-ink-soft">{b.roomName}</p>
            <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[0.95rem]">
              <SummaryRow label="When" value={`${b.night}, ${b.slot}`} />
              <SummaryRow label="Group" value={`${b.groupSize} ${b.groupSize === 1 ? "person" : "people"}`} />
            </dl>
            <p className="mt-5 text-[0.9rem] leading-relaxed text-ink-soft">
              {b.emailed
                ? `We've emailed the details and this floor plan to ${b.email}.`
                : `We couldn't send the confirmation email to ${b.email} just now, but your booking is saved under “Your bookings” on this page.`}{" "}
              You can change the headcount or time, or cancel, from this page.
            </p>
            <div className="mt-6 flex flex-wrap gap-5">
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
          <div className="mx-auto w-full max-w-[320px]">
            <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={320} />
          </div>
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

  const chosenNight = nights.find((n) => n.date === date);
  const chosenSlot = slots.find((s) => s.id === slotId);

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-10">
        <Step n={1} title="Pick a day" error={e.date}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {nights.map((n) => {
              const p = dayParts(n.date);
              const on = n.date === date;
              return (
                <button
                  key={n.date}
                  type="button"
                  onClick={() => pickDate(n.date)}
                  aria-pressed={on}
                  className={`flex flex-col items-center border px-2 py-3 transition-colors ${
                    on ? "border-clay bg-clay text-paper-bright" : "border-hairline bg-paper-bright text-ink hover:border-ink"
                  }`}
                >
                  <span className="label">{p.weekday}</span>
                  <span className="font-display mt-1 text-2xl leading-none">{p.day}</span>
                  <span className={`mt-1 text-[0.8rem] ${on ? "text-paper-bright/80" : "text-ink-mute"}`}>
                    {n.slots.length} {n.slots.length === 1 ? "slot" : "slots"} left
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="date" value={date} />
        </Step>

        <Step n={2} title="Pick a time" error={e.slotId}>
          <div className="grid gap-2 sm:grid-cols-3">
            {slots.map((s) => {
              const on = s.id === slotId;
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer flex-col border px-4 py-3 transition-colors ${
                    on ? "border-clay bg-clay/5 text-clay" : "border-hairline bg-paper-bright text-ink hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={s.id}
                    checked={on}
                    onChange={() => setSlotId(s.id)}
                    required
                    className="sr-only"
                  />
                  <span className="text-[1.02rem] font-semibold">{s.label}</span>
                  <span className={`mt-0.5 text-[0.82rem] ${on ? "text-clay" : "text-ink-mute"}`}>2&frac12; hours</span>
                </label>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="How many are coming?" error={e.groupSize} hint={`Including you. Up to ${MAX_GROUP_SIZE}. We pick a table that fits, joining neighbouring tables for bigger groups.`}>
          <div className="inline-flex items-stretch border border-hairline bg-paper-bright">
            <button
              type="button"
              onClick={() => setSize((v) => Math.max(1, v - 1))}
              disabled={size <= 1}
              aria-label="One fewer person"
              className="w-12 text-2xl text-ink transition-colors hover:bg-paper-deep disabled:text-ink-mute/40"
            >
              &minus;
            </button>
            <output aria-live="polite" className="font-display flex w-24 flex-col items-center justify-center border-x border-hairline py-2">
              <span className="text-3xl leading-none text-ink">{size}</span>
              <span className="mt-1 text-[0.75rem] text-ink-mute">{size === 1 ? "person" : "people"}</span>
            </output>
            <button
              type="button"
              onClick={() => setSize((v) => Math.min(MAX_GROUP_SIZE, v + 1))}
              disabled={size >= MAX_GROUP_SIZE}
              aria-label="One more person"
              className="w-12 text-2xl text-ink transition-colors hover:bg-paper-deep disabled:text-ink-mute/40"
            >
              +
            </button>
          </div>
          <input type="hidden" name="group_size" value={size} />
        </Step>

        <Step n={4} title="Dleader details" hint="Your table number and floor plan are emailed here.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.leaderName}>
              <input name="leader_name" required autoComplete="name" defaultValue={name} className={inputClass} />
            </Field>
            <Field label="Mobile number" error={e.contactMobile}>
              <input
                name="contact_mobile"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                defaultValue={mobile}
                placeholder="0917 123 4567"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" error={e.leaderEmail}>
                <input
                  name="leader_email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={email}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Step>

        <Step n={5} title="Dgroup policies" error={e.policies}>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {DGROUP_POLICIES.map((p) => (
              <li key={p.id} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <span className="font-semibold text-ink">{p.title}</span>
                <span className="text-[0.92rem] leading-relaxed text-ink-soft">{p.body}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-3 border border-hairline bg-paper-bright p-4 text-[0.95rem] text-ink has-[:checked]:border-clay">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(ev) => setAgreed(ev.target.checked)}
              required
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--clay)]"
            />
            <span>I accept these policies on behalf of my Dgroup.</span>
          </label>
          {/* The server records each policy by name; one tick accepts them all. */}
          {agreed ? DGROUP_POLICIES.map((p) => <input key={p.id} type="hidden" name={`policy_${p.id}`} value="on" />) : null}
        </Step>
      </div>

      <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
        <p className="label text-clay">Your booking</p>
        <dl className="mt-4 divide-y divide-hairline border-y border-hairline text-[0.95rem]">
          <SummaryRow label="Day" value={chosenNight?.label ?? "Pick a day"} />
          <SummaryRow label="Time" value={chosenSlot?.label ?? "Pick a time"} />
          <SummaryRow label="Group" value={`${size} ${size === 1 ? "person" : "people"}`} />
          <SummaryRow label="Table" value="Chosen for you" muted />
        </dl>

        {state?.formError ? (
          <p role="alert" className="mt-4 border-l-2 border-sky pl-3 text-[0.9rem] text-sky">
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
          disabled={pending || !agreed || !chosenSlot}
          className="btn-press label mt-5 w-full border border-clay bg-clay px-6 py-4 text-paper-bright transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Assigning your table…" : "Confirm booking"}
        </button>
        <p className="mt-3 text-[0.82rem] leading-relaxed text-ink-mute">
          {agreed ? "Confirmed straight away, with the details by email." : "Accept the policies to confirm."}
        </p>
      </aside>
    </form>
  );
}

function Step({
  n,
  title,
  hint,
  error,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-baseline gap-3">
        <span className="label tabular text-clay">{String(n).padStart(2, "0")}</span>
        <span className="font-display text-xl text-ink">{title}</span>
      </h3>
      {hint ? <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-mute">{hint}</p> : null}
      <div className="mt-4">{children}</div>
      {error ? <Err>{error}</Err> : null}
    </section>
  );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="label text-ink-mute">{label}</dt>
      <dd className={`text-right ${muted ? "text-ink-mute" : "text-ink"}`}>{value}</dd>
    </div>
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
