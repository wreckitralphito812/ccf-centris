"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { reserveDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import {
  AddToCalendar,
  BookingBar,
  ContactFields,
  FieldError,
  Question,
  StepButton,
  barButtonClass,
  choiceClass,
  countInputClass,
} from "@/components/booking";
import { cx } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { dgroupEvent } from "@/lib/calendar";
import {
  DGROUP_POLICIES,
  MAX_GROUP_SIZE,
  type NightOption,
  type SlotOption,
} from "@/lib/dgroup-tables";

export type { NightOption };

/** "Monday, Oct 5" → "Mon, Oct 5", for a day chip. */
export const shortNight = (label: string) => `${label.slice(0, 3)}${label.slice(label.indexOf(","))}`;

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

/** Where to move focus for each field the server sent back, in page order. */
const ERROR_TARGETS: [keyof NonNullable<DgroupBookingResult["fieldErrors"]>, string][] = [
  ["date", "#q-day"],
  ["slotId", "#q-time"],
  ["groupSize", "#group_size"],
  ["leaderName", "[name=leader_name]"],
  ["leaderEmail", "[name=leader_email]"],
  ["contactMobile", "[name=contact_mobile]"],
  ["policies", "#policies-ok"],
];

/** "4:00 – 6:30 PM" → "4:00 PM", for the pinned summary. */
const startTime = (label: string) => `${label.split(" – ")[0]} ${label.slice(-2)}`;

const dayFull = (n: NightOption) => n.slots.every((s) => s.fits === 0);

/**
 * Four numbered questions (day, time, headcount, details) and a bar pinned to
 * the bottom that keeps the answers so far in view with the one button.
 *
 * Built for the whole church, older members included (design review
 * 2026-09-30): big targets, 18px text, times that say how many tables are
 * left, and a headcount that starts empty so nobody books for a number they
 * didn't choose. Day and time are real radio buttons, so screen readers and
 * arrow keys treat them as one choice each.
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
  const [date, setDate] = useState(() => nights.find((n) => !dayFull(n))?.date ?? "");
  const [slot, setSlot] = useState("");
  const [count, setCount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const e = state?.fieldErrors ?? {};

  const people = /^\d+$/.test(count) ? Number(count) : 0;
  const night = nights.find((n) => n.date === date);
  const usable = (s: SlotOption) =>
    s.fits === undefined ? true : s.fits > 0 && (!people || people <= s.fits);
  // A time that no longer fits the headcount simply drops out of the answer.
  const chosen = night?.slots.find((s) => s.id === slot && usable(s));

  const missing = !night
    ? "Choose a day"
    : !chosen
      ? "Choose a time"
      : !people
        ? "How many people?"
        : people > MAX_GROUP_SIZE
          ? `Up to ${MAX_GROUP_SIZE} people`
          : !agreed
            ? "Tick the policies box"
            : null;

  // After the server answers: show the confirmation, or take the person
  // straight to the first thing that needs fixing.
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      doneRef.current?.scrollIntoView({ block: "center" });
      doneRef.current?.focus();
      return;
    }
    const errs = state.fieldErrors ?? {};
    const target = ERROR_TARGETS.find(([k]) => errs[k])?.[1] ?? (state.formError ? "#form-error" : null);
    if (!target) return;
    const el = formRef.current?.querySelector<HTMLElement>(target);
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
  }, [state]);

  if (state?.ok && state.booking) {
    const b = state.booking;
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="surface border-clay p-7 outline-none">
        <p className="label text-clay">You&rsquo;re booked</p>
        <p className="font-display mt-3 text-4xl leading-tight text-ink">{b.tables}</p>
        <p className="mt-1 text-lg text-ink-soft">{b.roomName}</p>
        <p className="mt-4 text-lg text-ink">
          {b.night}, {b.slot} · {b.groupSize} {b.groupSize === 1 ? "person" : "people"}
        </p>
        <div className="mt-6 max-w-sm">
          <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={320} />
        </div>
        <div className="mt-6">
          <AddToCalendar
            event={dgroupEvent({ date: b.date, slotId: b.slotId, roomSlug: b.roomSlug, labels: b.labels })}
          />
        </div>
        <p className="mt-6 border-t border-hairline pt-4 text-[1rem] leading-relaxed text-ink-soft">
          {b.emailed
            ? `We've emailed the details to ${b.email}.`
            : `We couldn't email ${b.email} just now, but your booking is saved.`}{" "}
          Change or cancel it any time from My reservations.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <button
            type="button"
            onClick={onAnother}
            className="label text-clay underline underline-offset-4 hover:text-clay-deep"
          >
            Book another slot
          </button>
          <Link href="/my/reservations" className="label text-clay underline underline-offset-4">
            My reservations
          </Link>
        </div>
      </div>
    );
  }

  if (!nights.length) {
    return (
      <p className="rounded-2xl border border-dashed border-hairline p-8 text-center text-[1.05rem] text-ink-mute">
        No times are open right now. Next week&rsquo;s days open on Sunday.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="pb-36"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (missing || pending) return;
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <Question n={1} id="q-day" title="Which day?" note="Next week opens every Sunday." error={e.date}>
        <div
          role="radiogroup"
          aria-labelledby="q-day"
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(nights.length, 5)}, minmax(0, 1fr))` }}
        >
          {nights.map((n) => {
            const [day, rest] = shortNight(n.label).split(", ");
            const full = dayFull(n);
            const on = date === n.date;
            return (
              <label
                key={n.date}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center rounded-2xl border px-1 py-2.5 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay has-[:focus-visible]:ring-offset-2",
                  full
                    ? "cursor-not-allowed border-hairline bg-paper text-ink-mute"
                    : on
                      ? "cursor-pointer border-clay bg-clay text-paper-bright"
                      : "cursor-pointer border-hairline bg-paper-bright text-ink hover:border-ink/40",
                )}
              >
                <input
                  type="radio"
                  name="date"
                  value={n.date}
                  checked={on}
                  disabled={full}
                  onChange={() => setDate(n.date)}
                  className="sr-only"
                />
                <span className="text-[1rem] font-semibold">{day}</span>
                <span className={cx("mt-0.5 text-[0.85rem]", on ? "text-paper-bright/85" : "text-ink-mute")}>
                  {full ? "Full" : rest}
                </span>
              </label>
            );
          })}
        </div>
      </Question>

      <Question n={2} id="q-time" title="What time?" error={e.slotId}>
        <div role="radiogroup" aria-labelledby="q-time" className="space-y-2.5">
          {(night?.slots ?? []).map((s) => {
            const ok = usable(s);
            const on = chosen?.id === s.id;
            return (
              <label
                key={s.id}
                className={cx("flex min-h-16 items-center justify-between gap-4 px-5 py-3.5", choiceClass(on, !ok))}
              >
                <input
                  type="radio"
                  name="slot"
                  value={s.id}
                  checked={on}
                  disabled={!ok}
                  onChange={() => setSlot(s.id)}
                  className="sr-only"
                />
                <span className={cx("text-[1.1rem] font-semibold", ok ? "text-ink" : "text-ink-mute line-through")}>
                  {s.label}
                </span>
                <SlotStatus s={s} people={people} on={on} />
              </label>
            );
          })}
        </div>
      </Question>

      <Question
        n={3}
        id="q-people"
        title="How many people?"
        note={`Including you. Up to ${MAX_GROUP_SIZE}. We'll pick a table that fits.`}
        error={e.groupSize}
      >
        <div className="flex items-center gap-4">
          <StepButton
            label="One fewer"
            disabled={people <= 1}
            onClick={() => setCount(String(Math.max(1, people - 1)))}
          >
            −
          </StepButton>
          <input
            id="group_size"
            name="group_size"
            aria-labelledby="q-people"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={count}
            onChange={(ev) => setCount(ev.target.value.replace(/\D/g, ""))}
            aria-invalid={e.groupSize ? true : undefined}
            className={countInputClass}
          />
          <StepButton
            label="One more"
            disabled={people >= MAX_GROUP_SIZE}
            onClick={() => setCount(String(Math.min(MAX_GROUP_SIZE, people + 1)))}
          >
            +
          </StepButton>
        </div>
      </Question>

      <Question n={4} id="q-details" title="Your details">
        <ContactFields
          fields={[
            {
              name: "leader_name",
              label: "Dleader name",
              value: name,
              autoComplete: "name",
              required: true,
              error: e.leaderName,
            },
            {
              name: "leader_email",
              label: "Dleader email",
              value: email,
              type: "email",
              autoComplete: "email",
              required: true,
              hint: "Your table number is sent here.",
              error: e.leaderEmail,
            },
            {
              name: "contact_mobile",
              label: "Dleader contact number",
              value: mobile,
              type: "tel",
              autoComplete: "tel",
              required: true,
              error: e.contactMobile,
            },
          ]}
        />

        <div className="mt-6">
          <label className="flex cursor-pointer items-start gap-3.5 text-[1.05rem] leading-snug text-ink">
            <input
              id="policies-ok"
              type="checkbox"
              checked={agreed}
              onChange={(ev) => setAgreed(ev.target.checked)}
              aria-invalid={e.policies ? true : undefined}
              aria-describedby="policies-list"
              className="mt-0.5 h-6 w-6 shrink-0 accent-clay"
            />
            <span>I agree to the Dgroup policies for my group.</span>
          </label>
          {agreed
            ? DGROUP_POLICIES.map((p) => <input key={p.id} type="hidden" name={`policy_${p.id}`} value="on" />)
            : null}
          <button
            type="button"
            onClick={() => setShowPolicies((v) => !v)}
            aria-expanded={showPolicies}
            aria-controls="policies-list"
            className="mt-2 ml-[2.4rem] min-h-11 text-[0.98rem] font-semibold text-clay underline underline-offset-4 hover:text-clay-deep"
          >
            {showPolicies ? "Hide the policies" : `Read the ${DGROUP_POLICIES.length} policies`}
          </button>
          <ul
            id="policies-list"
            hidden={!showPolicies}
            className="mt-2 space-y-2.5 rounded-2xl bg-paper p-5 text-[0.98rem] leading-relaxed text-ink-soft"
          >
            {DGROUP_POLICIES.map((p) => (
              <li key={p.id}>
                <span className="font-semibold text-ink">{p.title}.</span> {p.body}
              </li>
            ))}
          </ul>
          <FieldError text={e.policies} />
        </div>
      </Question>

      {state?.formError ? (
        <p
          id="form-error"
          tabIndex={-1}
          role="alert"
          className="mt-2 border-l-2 border-clay pl-4 text-[1rem] font-semibold text-clay-deep outline-none"
        >
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

      {/* The answers so far and the one button, pinned to the bottom. */}
      <BookingBar>
        <div className="min-w-0 flex-1 leading-snug" aria-live="polite">
          {night ? (
            <span className="block truncate text-[1rem] font-semibold text-ink">
              {chosen ? `${night.label.slice(0, 3)} · ${startTime(chosen.label)}` : shortNight(night.label)}
            </span>
          ) : null}
          <span className="block truncate text-[0.92rem] text-ink-mute">
            {missing ?? `${people} ${people === 1 ? "person" : "people"}`}
          </span>
        </div>
        <button type="submit" disabled={!!missing || pending} className={barButtonClass}>
          {pending ? "Booking…" : "Book my table"}
        </button>
      </BookingBar>
    </form>
  );
}

/** "12 tables free", "Only 2 left", "Full", or "Too full for 9". */
function SlotStatus({ s, people, on }: { s: SlotOption; people: number; on: boolean }) {
  if (s.fits === undefined || s.free === undefined) return null;
  const [text, tone] =
    s.fits === 0
      ? ["Full", "text-ink-mute"]
      : people > s.fits
        ? [`Too full for ${people}`, "text-ink-mute"]
        : s.free <= 3
          ? [`Only ${s.free} ${s.free === 1 ? "table" : "tables"} left`, "font-semibold text-clay-deep"]
          : [`${s.free} tables free`, on ? "font-semibold text-clay" : "text-moss"];
  return <span className={cx("shrink-0 text-right text-[0.95rem]", tone)}>{text}</span>;
}
