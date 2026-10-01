"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { reserveDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import {
  AddToCalendar,
  BookingBar,
  Confirmation,
  ContactFields,
  DayCircle,
  IconLine,
  PolicyAgreement,
  Question,
  StepButton,
  barButtonClass,
  choiceClass,
  countInputClass,
} from "@/components/booking";
import { cx } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { dgroupEvent } from "@/lib/calendar";
import { SITE } from "@/lib/site";
import { BookAgain } from "@/app/my/reservations/book-again";
import { manilaDateKey } from "@/lib/format";
import {
  DGROUP_POLICIES,
  manilaMinutes,
  MAX_GROUP_SIZE,
  rebookDate,
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
 * Four questions (day, time, headcount, details) on one calm card, and a bar
 * pinned to the bottom that keeps the answers so far in view with the one
 * button. Days are date circles; times are soft rows that turn solid teal
 * when chosen (the calm, Calendly-inspired look, 2026-09-30).
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
      <Confirmation
        focusRef={doneRef}
        aside={
          <div className="flex justify-center overflow-hidden rounded-2xl bg-mist p-4 lg:p-6">
            <div className="sm:hidden">
              <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={250} />
            </div>
            <div className="hidden sm:block lg:hidden">
              <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={440} />
            </div>
            <div className="hidden lg:block">
              <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={460} />
            </div>
          </div>
        }
        title="You’re booked"
        note={
          b.emailed
            ? `We’ve emailed the details to ${b.email}.`
            : `Your booking is saved. We couldn’t email ${b.email} just now.`
        }
      >
        <div className="space-y-3">
          <p className="text-[1.3rem] font-semibold leading-snug text-ink">
            {b.tables} · {b.roomName}
          </p>
          <IconLine icon="calendar">{b.night}</IconLine>
          <IconLine icon="clock">{b.slot}</IconLine>
          <IconLine icon="people">
            {b.groupSize} {b.groupSize === 1 ? "person" : "people"}
          </IconLine>
          <IconLine icon="pin">{SITE.addressLines.slice(0, 2).join(", ")}</IconLine>
        </div>
        <AddToCalendar
          bare
          event={dgroupEvent({ date: b.date, slotId: b.slotId, roomSlug: b.roomSlug, labels: b.labels })}
        />
        <BookAgain
          id={b.id}
          target={rebookDate(b.date, b.slotId, manilaDateKey(), manilaMinutes())}
          label="Book the same time next week"
        />
        <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.98rem]">
          <button type="button" onClick={onAnother} className="min-h-11 font-semibold text-clay hover:underline">
            Book another time
          </button>
          <Link href="/my/reservations" className="inline-flex min-h-11 items-center font-semibold text-clay hover:underline">
            My reservations
          </Link>
        </p>
      </Confirmation>
    );
  }

  if (!nights.length) {
    return (
      <p className="calm-card px-8 py-10 text-center text-[1.05rem] text-ink-mute">
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
      <div className="calm-card px-6 py-8 sm:px-9 sm:py-10">
        <Question
          id="q-day"
          title="Which day?"
          note="This week, Monday to Friday. Next week opens on Sunday."
          error={e.date}
        >
          <div
            role="radiogroup"
            aria-labelledby="q-day"
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${Math.min(nights.length, 5)}, minmax(0, 1fr))` }}
          >
            {nights.map((n) => {
              const [day, rest] = shortNight(n.label).split(", ");
              const full = dayFull(n);
              return (
                <DayCircle
                  key={n.date}
                  name="date"
                  value={n.date}
                  weekday={day}
                  day={rest.split(" ")[1]}
                  on={date === n.date}
                  disabled={full}
                  note={full ? "Full" : undefined}
                  onChange={() => setDate(n.date)}
                />
              );
            })}
          </div>
        </Question>

        <Question id="q-time" title="What time?" note={night?.label} error={e.slotId}>
          <div role="radiogroup" aria-labelledby="q-time" className="space-y-3">
            {(night?.slots ?? []).map((s) => {
              const ok = usable(s);
              const on = chosen?.id === s.id;
              return (
                <label
                  key={s.id}
                  className={cx("flex min-h-[3.75rem] items-center justify-between gap-4 px-5 py-4", choiceClass(on, !ok))}
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
                  <span className={cx("whitespace-nowrap text-[1.05rem]", ok && "font-semibold")}>
                    {s.label}
                  </span>
                  <SlotStatus s={s} people={people} on={on} />
                </label>
              );
            })}
          </div>
        </Question>

        <Question
          id="q-people"
          title="How many people?"
          note={`Including you, up to ${MAX_GROUP_SIZE}. We’ll pick a table that fits.`}
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

        <Question id="q-details" title="Your details">
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
            <PolicyAgreement
              id="policies-ok"
              policies={[...DGROUP_POLICIES]}
              label="I agree to the Dgroup policies for my group."
              checked={agreed}
              onChange={setAgreed}
              error={e.policies}
            />
            {agreed
              ? DGROUP_POLICIES.map((p) => <input key={p.id} type="hidden" name={`policy_${p.id}`} value="on" />)
              : null}
          </div>
        </Question>
      </div>

      {state?.formError ? (
        <p
          id="form-error"
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-2xl bg-sky-wash px-5 py-4 text-[1rem] font-semibold text-sky outline-none"
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
          ? [`Only ${s.free} left`, on ? "text-paper-bright" : "font-semibold text-clay-deep"]
          : [`${s.free} tables free`, on ? "text-paper-bright/85" : "text-moss"];
  return <span className={cx("shrink-0 text-right text-[0.92rem] font-medium", tone)}>{text}</span>;
}
