"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoomRequest, roomBusyTimes, type RoomRequestResult } from "@/app/actions/reservations";
import {
  AddToCalendar,
  BookingBar,
  Confirmation,
  DayCircle,
  IconLine,
  PolicyAgreement,
  calmChipClass,
  Question,
  StepButton,
  barButtonClass,
  choiceClass,
  countInputClass,
} from "@/components/booking";
import { cx } from "@/components/ui";
import { roomEvent, type CalendarEvent } from "@/lib/calendar";
import {
  EQUIPMENT,
  FOOD,
  MINISTRIES,
  MINISTRY_ROOMS,
  SETUPS,
  STEP_MINUTES,
  TIME_BLOCKS,
  closedReason,
  equipmentSummary,
  ministryWindow,
  timeLabel,
  toHHMM,
  toMinutes,
  weekdayOf,
  type MinistryRoom,
  type Minutes,
  type Setup,
} from "@/lib/ministry-rooms";
import { ROOM_POLICIES } from "./policies";

/**
 * A ministry's room request, in two steps (design review, 2026-09-30):
 *
 *   1. Find a room: which day, what time (Morning, Afternoon, Evening, or
 *      another time), how many people, then every room as a card that says
 *      whether it's free, taken, too small, or kept for Dgroups.
 *   2. Details and send: the event, equipment and food, your details, and the
 *      whole request in one box with a Change button, then one tick for the
 *      policies.
 *
 * It replaces a three-step flow with a timeline board, which was quick for
 * some but hard to read for older members. The request so far and the next
 * button live in a bar pinned to the bottom. Every rule is checked again on
 * the server.
 */

export type Busy = Record<string, [Minutes, Minutes][]>;
type StepId = 1 | 2;

const DAY_START = toMinutes("09:00");
const DAY_END = toMinutes("21:30");

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const mondayOf = (date: string) => addDays(date, -((weekdayOf(date) + 6) % 7));
const dayNum = (date: string) => Number(date.slice(8));
const monthOf = (date: string) => MONTH[Number(date.slice(5, 7)) - 1];
const dateLong = (date: string) => `${WEEKDAY_LONG[weekdayOf(date)]}, ${dayNum(date)} ${MONTH_LONG[Number(date.slice(5, 7)) - 1]}`;
const dateShort = (date: string) => `${WEEKDAY[weekdayOf(date)]} ${dayNum(date)} ${monthOf(date)}`;
const range = (a: Minutes, b: Minutes) => `${timeLabel(a)} – ${timeLabel(b)}`;
const roomName = (slug: string) => MINISTRY_ROOMS.find((r) => r.slug === slug)?.name ?? slug;
const shortName = (slug: string) => roomName(slug).split(" (")[0];

/** Minutes after midnight in Manila right now. */
const manilaNow = () => {
  const d = new Date();
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 8 * 60) % 1440;
};

const smoothTop = () =>
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

/** Where to move focus for each field the server sent back, and on which step. */
const ERROR_TARGETS: [string, StepId, string][] = [
  ["date", 1, "#q-day"],
  ["time", 1, "#q-time"],
  ["participants", 1, "#q-people"],
  ["setup", 1, "#q-people"],
  ["rooms", 1, "#q-room"],
  ["activity", 2, "#f-activity"],
  ["ministry", 2, "#f-ministry"],
  ["food", 2, "#q-extras"],
  ["name", 2, "#f-name"],
  ["mobile", 2, "#f-mobile"],
  ["accept", 2, "#f-accept"],
];

const INPUT = "calm-input";

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d={dir === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"} />
    </svg>
  );
}

export function BookingFlow(props: {
  today: string;
  firstDay: string;
  initialBusy: Busy | null;
  name: string;
  email: string;
  mobile: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return <Request key={attempt} {...props} onAnother={() => setAttempt((a) => a + 1)} />;
}

/** Why a room can't be picked, or how it stands, for the answers so far. */
interface RoomStatus {
  text: string;
  tone: "free" | "muted" | "warn";
  disabled: boolean;
}

function Request({
  today,
  firstDay,
  initialBusy,
  name: initialName,
  email,
  mobile: initialMobile,
  onAnother,
}: {
  today: string;
  firstDay: string;
  initialBusy: Busy | null;
  name: string;
  email: string;
  mobile: string;
  onAnother: () => void;
}) {
  const [state, action, sending] = useActionState<RoomRequestResult | null, FormData>(createRoomRequest, null);
  const e = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<StepId>(1);

  // 1. Find a room
  const [nowMinutes] = useState(manilaNow);
  const [date, setDate] = useState(firstDay);
  const [week, setWeek] = useState(() => mondayOf(firstDay));
  const [when, setWhen] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState<Minutes | null>(null);
  const [customEnd, setCustomEnd] = useState<Minutes | null>(null);
  const [count, setCount] = useState("");
  const [setup, setSetup] = useState<Setup>("classroom");
  const [rooms, setRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ date: string; times: Busy } | null>(
    initialBusy ? { date: firstDay, times: initialBusy } : null,
  );

  // 2. Details and send
  const [activity, setActivity] = useState("");
  const [ministry, setMinistry] = useState("");
  const [ministryOther, setMinistryOther] = useState("");
  const [equipment, setEquipment] = useState<Record<string, number>>({});
  const [food, setFood] = useState("none");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [agreed, setAgreed] = useState(false);

  // What's already held on the chosen date. The first day comes with the
  // page; other days, and every day after a failed send (someone may have
  // taken a room meanwhile), are read here.
  useEffect(() => {
    if (!state && date === firstDay && initialBusy) return;
    let live = true;
    roomBusyTimes(date).then((times) => live && setBusy({ date, times }));
    return () => {
      live = false;
    };
  }, [date, state, firstDay, initialBusy]);

  // A failed send goes back to the step that needs fixing.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const f = state?.fieldErrors ?? {};
    const first = ERROR_TARGETS.find(([k]) => f[k as keyof typeof f]);
    if (first) setStep(first[1]);
  }

  // …then focus lands on the first thing to fix.
  useEffect(() => {
    if (!state || state.ok) return;
    const f = state.fieldErrors ?? {};
    const target = ERROR_TARGETS.find(([k]) => f[k as keyof typeof f])?.[2] ?? (state.formError ? "#form-error" : null);
    if (!target) return;
    const el = formRef.current?.querySelector<HTMLElement>(target);
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
  }, [state]);

  const loaded = busy?.date === date;
  const earliest = date === today ? Math.ceil((nowMinutes + 1) / STEP_MINUTES) * STEP_MINUTES : DAY_START;
  const blockOk = (b: (typeof TIME_BLOCKS)[number]) => b.from >= earliest;
  const block = TIME_BLOCKS.find((b) => b.id === when && blockOk(b));
  const start = when === "other" ? customStart : (block?.from ?? null);
  const end = when === "other" ? customEnd : (block?.to ?? null);
  const timed = start !== null && end !== null && start >= earliest;
  const people = /^\d+$/.test(count) ? Number(count) : 0;
  const setupInfo = SETUPS.find((s) => s.id === setup)!;

  const starts = useMemo(() => {
    const out: Minutes[] = [];
    for (let m = Math.max(DAY_START, earliest); m < DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [earliest]);
  const ends = useMemo(() => {
    const out: Minutes[] = [];
    if (customStart === null) return out;
    for (let m = customStart + STEP_MINUTES; m <= DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [customStart]);

  /** Closed, taken, or without the set-up: why a room is out, whatever the headcount. */
  const unavailable = (r: MinistryRoom): string | null => {
    if (!r.capacity[setup]) return `No ${setupInfo.label.toLowerCase()} set-up`;
    if (!timed) return null;
    const w = ministryWindow(r.slug, date);
    if (r.dgroupRoom && w && w.to === toMinutes("12:00") && end! > w.to) return "Dgroups use it after 12 NN";
    const why = closedReason(r.slug, date, start!, end!);
    if (why) return why;
    const clash = loaded ? (busy!.times[r.slug] ?? []).find(([a, b]) => a < end! && b > start!) : undefined;
    return clash ? `Taken ${range(clash[0], clash[1])}` : null;
  };
  const openRooms = MINISTRY_ROOMS.filter((r) => !unavailable(r));
  const anyFits = !people || openRooms.some((r) => (r.capacity[setup] ?? 0) >= people);
  const openSeats = openRooms.reduce((n, r) => n + (r.capacity[setup] ?? 0), 0);

  const statusOf = (r: MinistryRoom): RoomStatus => {
    const out = unavailable(r);
    if (out) return { text: out, tone: "muted", disabled: true };
    const cap = r.capacity[setup]!;
    if (people && cap < people) {
      // Too small is only a dead end when some other room fits on its own.
      return anyFits
        ? { text: `Too small for ${people}`, tone: "muted", disabled: true }
        : { text: "Add another room", tone: "warn", disabled: false };
    }
    if (!timed) return { text: "", tone: "muted", disabled: false };
    return loaded ? { text: "Free", tone: "free", disabled: false } : { text: "Checking…", tone: "muted", disabled: false };
  };

  const picked = rooms.filter((slug) => !statusOf(MINISTRY_ROOMS.find((r) => r.slug === slug)!).disabled);
  const seats = picked.reduce((n, slug) => n + (MINISTRY_ROOMS.find((r) => r.slug === slug)!.capacity[setup] ?? 0), 0);
  const ministryName = ministry === "Other" ? ministryOther.trim() : ministry;

  const missingByStep: Record<StepId, string | null> = {
    1: !timed ? "Choose a time" : !people ? "How many people?" : !picked.length ? "Pick a room" : null,
    2: !activity.trim()
      ? "Name your event"
      : !ministryName
        ? "Choose your ministry"
        : !name.trim()
          ? "Add your name"
          : mobile.replace(/\D/g, "").length < 7
            ? "Add a mobile number"
            : !agreed
              ? "Tick the policies box"
              : null,
  };
  const missing = missingByStep[step];

  if (state?.ok) {
    return (
      <Sent
        reference={state.reference ?? "—"}
        email={email}
        emailed={Boolean(state.emailed)}
        event={
          timed
            ? roomEvent({
                reference: state.reference ?? "request",
                activity,
                rooms: picked.map(roomName),
                date,
                start: toHHMM(start!),
                end: toHHMM(end!),
                confirmed: false,
              })
            : null
        }
        details={{
          event: activity,
          date: dateLong(date),
          time: timed ? range(start!, end!) : "—",
          rooms: picked.map(roomName).join(", "),
          people,
        }}
        onAnother={onAnother}
      />
    );
  }

  const goTo = (s: StepId) => {
    setStep(s);
    smoothTop();
  };
  const toggleRoom = (slug: string) => setRooms((r) => (r.includes(slug) ? r.filter((s) => s !== slug) : [...r, slug]));
  const pickCustomStart = (s: Minutes | null) => {
    setCustomStart(s);
    if (s !== null && (customEnd === null || customEnd <= s)) setCustomEnd(Math.min(s + 120, DAY_END));
  };

  const prevWeek = addDays(week, -7);
  const canPrev = addDays(prevWeek, 5) >= today;
  const days = Array.from({ length: 6 }, (_, i) => addDays(week, i));
  const whenText = timed ? range(start!, end!) : null;

  return (
    <form ref={formRef} action={action} className="mx-auto max-w-2xl pb-36 lg:max-w-6xl">
      {/* Everything the server needs, whichever step is showing. */}
      <input type="hidden" name="participants" value={count} />
      <input type="hidden" name="setup" value={setup} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={timed ? toHHMM(start!) : ""} />
      <input type="hidden" name="end" value={timed ? toHHMM(end!) : ""} />
      {picked.map((r) => (
        <input key={r} type="hidden" name="room" value={r} />
      ))}
      <input type="hidden" name="activity" value={activity} />
      <input type="hidden" name="ministry" value={ministry} />
      <input type="hidden" name="ministry_other" value={ministryOther} />
      {EQUIPMENT.map((item) => (
        <input key={item.id} type="hidden" name={`eq_${item.id}`} value={equipment[item.id] ?? 0} />
      ))}
      <input type="hidden" name="food" value={food} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="mobile" value={mobile} />
      {agreed ? <input type="hidden" name="accept" value="on" /> : null}

      <p className="text-[0.95rem] font-semibold text-clay">Step {step} of 2</p>
      <h2 className="mt-1.5 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink sm:text-[2rem]">
        {step === 1 ? "Find a room" : "Details and send"}
      </h2>
      <p className="mt-2 text-[1.05rem] text-ink-mute">
        {step === 1
          ? "Tell us when and how many. We'll show the rooms that fit."
          : "A few details for the facilities team, then send."}
      </p>

      {/* On laptops each step splits in two, Calendly-style: the when on the
          left, the rooms (step 1) or the request so far (step 2) on the right.
          Ralph found the single phone-width column cramped (2026-10-01). */}
      {step === 1 ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10">
          <Question id="q-day" title="Which day?" note="Monday to Saturday." error={e.date}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[1rem] font-semibold text-ink">
                {dayNum(days[0])} {monthOf(days[0])} – {dayNum(days[5])} {monthOf(days[5])}
              </p>
              <div className="flex gap-2">
                <ArrowButton label="Previous week" disabled={!canPrev} onClick={() => setWeek(prevWeek)}>
                  <ChevronIcon dir="left" />
                </ArrowButton>
                <ArrowButton label="Next week" onClick={() => setWeek(addDays(week, 7))}>
                  <ChevronIcon dir="right" />
                </ArrowButton>
              </div>
            </div>
            <div role="radiogroup" aria-labelledby="q-day" className="mt-5 grid grid-cols-6 gap-1">
              {days.map((d) => {
                const past = d < today;
                return (
                  <DayCircle
                    key={d}
                    name="day"
                    value={d}
                    weekday={WEEKDAY[weekdayOf(d)]}
                    day={dayNum(d)}
                    on={d === date}
                    disabled={past}
                    note={past ? "Past" : undefined}
                    onChange={() => setDate(d)}
                  />
                );
              })}
            </div>
          </Question>

          <Question id="q-time" title="What time?" note="Include time to set up and pack up." error={e.time}>
            <div role="radiogroup" aria-labelledby="q-time" className="grid gap-3 sm:grid-cols-2">
              {[...TIME_BLOCKS, { id: "other", label: "Other time", from: 0, to: 0 }].map((b) => {
                const other = b.id === "other";
                const ok = other || blockOk(b);
                const on = when === b.id && ok;
                return (
                  <label key={b.id} className={cx("flex min-h-[4.25rem] flex-col justify-center px-5 py-3.5", choiceClass(on, !ok))}>
                    <input
                      type="radio"
                      name="when"
                      value={b.id}
                      checked={on}
                      disabled={!ok}
                      onChange={() => setWhen(b.id)}
                      className="sr-only"
                    />
                    <span className={cx("text-[1.05rem]", ok && "font-semibold")}>{b.label}</span>
                    <span className={cx("mt-0.5 text-[0.92rem]", on ? "text-paper-bright/85" : "text-ink-mute")}>
                      {other ? "Choose a start and end" : ok ? range(b.from, b.to) : "Already started"}
                    </span>
                  </label>
                );
              })}
            </div>
            {when === "other" ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[0.95rem] font-semibold text-ink">Starts</span>
                  <select
                    value={customStart === null ? "" : String(customStart)}
                    onChange={(ev) => pickCustomStart(ev.target.value ? Number(ev.target.value) : null)}
                    className={cx(INPUT, "mt-1.5")}
                  >
                    <option value="">Choose</option>
                    {starts.map((m) => (
                      <option key={m} value={m}>
                        {timeLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[0.95rem] font-semibold text-ink">Ends</span>
                  <select
                    value={customEnd === null ? "" : String(customEnd)}
                    disabled={customStart === null}
                    onChange={(ev) => setCustomEnd(ev.target.value ? Number(ev.target.value) : null)}
                    className={cx(INPUT, "mt-1.5")}
                  >
                    <option value="">{customStart === null ? "—" : "Choose"}</option>
                    {ends.map((m) => (
                      <option key={m} value={m}>
                        {timeLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </Question>

          <Question
            id="q-people"
            title="How many people?"
            note="Everyone coming, your team included. Type it, or use − and + to go 5 at a time."
            error={e.participants ?? e.setup}
          >
            <div className="flex items-center gap-4">
              <StepButton label="Fewer people" disabled={people <= 1} onClick={() => setCount(String(Math.max(1, people - 5)))}>
                −
              </StepButton>
              <input
                aria-labelledby="q-people"
                inputMode="numeric"
                autoComplete="off"
                maxLength={3}
                value={count}
                onChange={(ev) => setCount(ev.target.value.replace(/\D/g, ""))}
                className={countInputClass}
              />
              <StepButton label="More people" disabled={false} onClick={() => setCount(String(people + 5))}>
                +
              </StepButton>
            </div>
            <p id="setup-label" className="mt-7 text-[1rem] font-semibold text-ink">
              How should the room be set up?
            </p>
            <div role="radiogroup" aria-labelledby="setup-label" className="mt-3 flex flex-wrap gap-2">
              {SETUPS.map((s) => (
                <label key={s.id} className={calmChipClass(setup === s.id)}>
                  <input
                    type="radio"
                    name="setup_choice"
                    value={s.id}
                    checked={setup === s.id}
                    onChange={() => setSetup(s.id)}
                    className="sr-only"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <p className="mt-2.5 text-[0.95rem] text-ink-mute">{setupInfo.hint}.</p>
          </Question>

        </div>
        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10">
          <Question
            id="q-room"
            title="Pick a room"
            note={
              timed
                ? `${dateLong(date)}, ${whenText}${people ? ` · ${people} people` : ""}. You can pick more than one.`
                : "Choose a time first to see which rooms are free."
            }
            error={e.rooms}
          >
            {timed && people && !anyFits ? (
              <p className="mb-4 rounded-2xl bg-mist p-4 text-[1rem] leading-relaxed text-ink">
                {openSeats >= people
                  ? `No room seats ${people} on its own at that time. Tick several rooms to split your group, or try another time.`
                  : `No room seats ${people} at that time, even together. Try another time or day.`}
              </p>
            ) : null}
            <div role="group" aria-labelledby="q-room" className="space-y-3">
              {MINISTRY_ROOMS.map((r) => {
                const s = statusOf(r);
                const on = picked.includes(r.slug);
                const [main, alt] = r.name.replace(")", "").split(" (");
                const cap = r.capacity[setup];
                return (
                  <label key={r.slug} className={cx("flex min-h-[4.25rem] items-center gap-4 px-5 py-3.5", choiceClass(on, s.disabled))}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={s.disabled}
                      onChange={() => toggleRoom(r.slug)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cx(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                        on ? "border-paper-bright bg-paper-bright text-clay" : s.disabled ? "border-ink/10" : "border-edge",
                      )}
                    >
                      {on ? <CheckIcon className="h-4 w-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
                      <span className="block">
                        <span className={cx("block text-[1.05rem]", !s.disabled && "font-semibold")}>
                          {main}
                          {alt ? <span className={cx("font-normal", on ? "text-paper-bright/80" : "text-ink-mute")}> · {alt}</span> : null}
                        </span>
                        {cap ? (
                          <span className={cx("mt-0.5 block text-[0.92rem]", on ? "text-paper-bright/85" : "text-ink-mute")}>
                            Seats {cap}
                          </span>
                        ) : null}
                      </span>
                      {s.text ? (
                        <span
                          className={cx(
                            "mt-0.5 block text-[0.92rem] font-medium sm:mt-0 sm:shrink-0 sm:text-right",
                            on
                              ? "text-paper-bright"
                              : s.tone === "free"
                                ? "text-moss"
                                : s.tone === "warn"
                                  ? "text-clay-deep"
                                  : "text-ink-mute",
                          )}
                        >
                          {s.text}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {picked.length && people ? (
              <p className={cx("mt-4 text-[1rem]", seats < people ? "font-semibold text-clay-deep" : "text-ink-soft")}>
                {seats < people
                  ? `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats}, fewer than your ${people}. Tick another room.`
                  : `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats}, enough for your ${people}.`}
              </p>
            ) : null}
          </Question>
        </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10">
          <Question id="q-event" title="About your event">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Event name" error={e.activity}>
                  <input id="f-activity" value={activity} onChange={(ev) => setActivity(ev.target.value)} placeholder="e.g. Elevate core huddle" className={INPUT} />
                </TextField>
              </div>
              <TextField label="Ministry" hint="The lead ministry, if several are involved." error={e.ministry}>
                <select id="f-ministry" value={ministry} onChange={(ev) => setMinistry(ev.target.value)} className={INPUT}>
                  <option value="" disabled>
                    Choose your ministry
                  </option>
                  {MINISTRIES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </TextField>
              {ministry === "Other" ? (
                <TextField label="Ministry name">
                  <input value={ministryOther} onChange={(ev) => setMinistryOther(ev.target.value)} className={INPUT} />
                </TextField>
              ) : null}
            </div>
          </Question>

          <Question id="q-extras" title="Equipment and food" note="Optional. Tap what you'd like set up." error={e.food}>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((item) => (
                <EquipmentChip
                  key={item.id}
                  label={item.label}
                  max={item.max}
                  count={equipment[item.id] ?? 0}
                  onChange={(n) => setEquipment((eq) => ({ ...eq, [item.id]: n }))}
                />
              ))}
            </div>
            <p id="food-label" className="mt-7 text-[1rem] font-semibold text-ink">
              Food
            </p>
            <div role="radiogroup" aria-labelledby="food-label" className="mt-3 flex flex-wrap gap-2">
              {FOOD.map((f) => (
                <label key={f.id} className={calmChipClass(food === f.id)}>
                  <input type="radio" name="food_choice" value={f.id} checked={food === f.id} onChange={() => setFood(f.id)} className="sr-only" />
                  {f.label}
                </label>
              ))}
            </div>
            {FOOD.find((f) => f.id === food)?.hint ? (
              <p className="mt-2.5 text-[0.95rem] text-ink-mute">{FOOD.find((f) => f.id === food)!.hint}</p>
            ) : null}
            <div className="mt-7">
              <TextField label="Anything else?" hint="Optional. A special set-up, a repeating schedule, or anything the team should know.">
                <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} className={INPUT} />
              </TextField>
            </div>
          </Question>

          <Question id="q-you" title="Your details" note={`The confirmation goes to ${email}.`}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Name" error={e.name}>
                <input id="f-name" value={name} onChange={(ev) => setName(ev.target.value)} autoComplete="name" className={INPUT} />
              </TextField>
              <TextField label="Mobile number" hint="For same-day changes." error={e.mobile}>
                <input
                  id="f-mobile"
                  value={mobile}
                  onChange={(ev) => setMobile(ev.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                  className={INPUT}
                />
              </TextField>
            </div>
          </Question>

        </div>
        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10 lg:sticky lg:top-24">
          {/* The whole request in one place before it goes. */}
          <section aria-labelledby="check-h" className="rounded-2xl bg-mist p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 id="check-h" className="text-[1.2rem] font-semibold text-ink">
                Your request
              </h3>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="min-h-11 shrink-0 text-[0.98rem] font-semibold text-clay underline underline-offset-4 hover:text-clay-deep"
              >
                Change
              </button>
            </div>
            <dl className="mt-3 space-y-2 text-[1.05rem] leading-relaxed">
              {(
                [
                  [picked.length > 1 ? "Rooms" : "Room", `${picked.map(roomName).join(", ")} · seats ${seats}`],
                  ["When", `${dateLong(date)}, ${whenText ?? "—"}`],
                  ["People", `${people}, ${setupInfo.label.toLowerCase()} set-up`],
                  ["Equipment", equipmentSummary(equipment)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-ink-mute">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6">
            <PolicyAgreement
              id="f-accept"
              policies={ROOM_POLICIES.map(([title, body]) => ({ title, body }))}
              label="I accept the room policies on behalf of my ministry."
              checked={agreed}
              onChange={setAgreed}
              error={e.accept}
            />
          </div>

          {state?.formError ? (
            <p id="form-error" tabIndex={-1} role="alert" className="mt-6 rounded-2xl bg-sky-wash px-5 py-4 text-[1rem] font-semibold text-sky outline-none">
              {state.formError}
              {state.needsAuth ? (
                <>
                  {" "}
                  <Link href="/sign-in?next=/centris/reserve" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        </div>
      )}

      {/* The request so far and the next step, pinned to the bottom of the screen */}
      <BookingBar width="max-w-2xl lg:max-w-6xl">
        {step === 2 ? (
          <button
            type="button"
            onClick={() => goTo(1)}
            aria-label="Back to step 1"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-edge text-clay hover:border-clay"
          >
            <ChevronIcon dir="left" />
          </button>
        ) : null}
        {step === 1 ? (
          <div className="min-w-0 flex-1 leading-snug" aria-live="polite">
            <span className="block truncate text-[1rem] font-semibold text-ink">
              {picked.length ? `${picked.map(shortName).join(" + ")} · ${dateShort(date)}` : dateShort(date)}
            </span>
            <span className="block truncate text-[0.92rem] text-ink-mute">
              {missing ?? `${whenText} · ${people} people`}
            </span>
          </div>
        ) : (
          // The request is in the box above, so on phones the bar only says what's left to do.
          <div className="min-w-0 flex-1 leading-snug" aria-live="polite">
            <span className="block text-[1rem] font-semibold text-ink">{missing ?? "Ready to send"}</span>
            <span className="hidden truncate text-[0.92rem] text-ink-mute sm:block">
              {picked.map(shortName).join(" + ")} · {dateShort(date)} · {whenText}
            </span>
          </div>
        )}
        {step === 1 ? (
          <button type="button" onClick={() => !missing && goTo(2)} disabled={Boolean(missing)} className={barButtonClass}>
            Next<span className="hidden sm:inline">: event details</span>
          </button>
        ) : (
          <button type="submit" disabled={sending || Boolean(missing)} className={barButtonClass}>
            {sending ? "Sending…" : "Send request"}
          </button>
        )}
      </BookingBar>
    </form>
  );
}

/* --- Pieces ----------------------------------------------------------------- */

function ArrowButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border border-edge bg-paper-bright text-clay transition-colors hover:border-clay disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-mute/40 disabled:hover:border-edge"
    >
      {children}
    </button>
  );
}

function EquipmentChip({ label, max, count, onChange }: { label: string; max: number; count: number; onChange: (n: number) => void }) {
  if (!count || max === 1) {
    return (
      <button
        type="button"
        aria-pressed={Boolean(count)}
        onClick={() => onChange(count ? 0 : 1)}
        className={calmChipClass(Boolean(count))}
      >
        {count ? <CheckIcon /> : null}
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex min-h-12 items-stretch rounded-lg bg-clay text-[1rem] text-paper-bright">
      <button type="button" aria-label={`One fewer ${label.toLowerCase()}`} onClick={() => onChange(count - 1)} className="w-11 cursor-pointer rounded-l-lg hover:bg-clay-deep">
        &minus;
      </button>
      <span aria-live="polite" className="flex items-center px-1 tabular-nums">
        {count} × {label}
      </span>
      <button
        type="button"
        aria-label={`One more ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, count + 1))}
        disabled={count >= max}
        className="w-11 cursor-pointer rounded-r-lg hover:bg-clay-deep disabled:cursor-not-allowed disabled:text-paper-bright/40"
      >
        +
      </button>
    </span>
  );
}

function TextField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[1rem] font-semibold text-ink">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[0.92rem] text-ink-mute">{hint}</span> : null}
      {error ? (
        <span role="alert" className="mt-2 block text-[1rem] font-semibold text-clay-deep">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Sent({
  reference,
  email,
  emailed,
  details,
  event,
  onAnother,
}: {
  reference: string;
  email: string;
  emailed: boolean;
  details: { event: string; date: string; time: string; rooms: string; people: number };
  event: CalendarEvent | null;
  onAnother: () => void;
}) {
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    doneRef.current?.scrollIntoView({ block: "center" });
    doneRef.current?.focus({ preventScroll: true });
  }, []);
  const steps: [string, string, boolean][] = [
    ["Request sent", emailed ? `A copy is in ${email}.` : "Saved under My reservations.", true],
    ["The facilities team reviews it", "Your rooms are held for you while they check.", false],
    ["You get a confirmation email", "Then it’s safe to announce your event.", false],
  ];
  return (
    <Confirmation
      focusRef={doneRef}
      aside={
        <div className="rounded-2xl bg-mist p-6 lg:p-8">
        <p className="text-[1rem] font-semibold text-ink">What happens next</p>
        <ol className="mt-4 space-y-4">
          {steps.map(([t, b, done], i) => (
            <li key={t} className="flex gap-3.5">
              <span
                aria-hidden
                className={cx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.8rem] font-semibold",
                  done ? "bg-clay text-paper-bright" : "bg-rule text-ink-mute",
                )}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              <span>
                <span className="block font-semibold text-ink">{t}</span>
                <span className="mt-0.5 block text-[0.95rem] text-ink-mute">{b}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      }
      title="Request sent"
      note={
        <>
          Reference <span className="font-semibold tabular-nums text-ink">{reference}</span>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[1.3rem] font-semibold leading-snug text-ink">{details.event}</p>
        <IconLine icon="calendar">{details.date}</IconLine>
        <IconLine icon="clock">{details.time}</IconLine>
        <IconLine icon="pin">{details.rooms}</IconLine>
        <IconLine icon="people">{details.people} people</IconLine>
      </div>
      {event ? (
        <div>
          <AddToCalendar bare event={event} />
          <p className="mt-2.5 text-[0.9rem] text-ink-mute">
            Marked as requested. The confirmation email brings the final invite.
          </p>
        </div>
      ) : null}
      <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.98rem]">
        <Link href="/my/reservations" className="inline-flex min-h-11 items-center font-semibold text-clay hover:underline">
          See my requests
        </Link>
        <button type="button" onClick={onAnother} className="min-h-11 font-semibold text-clay hover:underline">
          Request another room
        </button>
      </p>
    </Confirmation>
  );
}
