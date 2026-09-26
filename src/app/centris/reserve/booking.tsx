"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createRoomRequest, roomBusyTimes, type RoomRequestResult } from "@/app/actions/reservations";
import {
  EQUIPMENT,
  FOOD,
  MINISTRIES,
  MINISTRY_ROOMS,
  SETUPS,
  STEP_MINUTES,
  closedReason,
  equipmentSummary,
  ministryWindow,
  timeLabel,
  toHHMM,
  toMinutes,
  weekdayOf,
  type Minutes,
  type Setup,
} from "@/lib/ministry-rooms";
import { ROOM_POLICIES } from "./policies";

/**
 * A ministry's room request, in three steps, the way booking sites do it:
 *
 *   1. Find a room: when (a week of days, then start and end), how many, and
 *      every room on one shared timeline, so what's free, closed or taken is
 *      visible at a glance. Tapping a free spot on a room picks that room and
 *      time at once.
 *   2. Event details: name, ministry, equipment, food.
 *   3. Review and send: the whole request with Edit links, contact details
 *      from the account, and one tick for the policies.
 *
 * The request so far and the next button live in a bar pinned to the bottom
 * of the screen, so the steps get the full width. Every rule is checked again
 * on the server.
 */

type Busy = Record<string, [Minutes, Minutes][]>;
type StepId = 1 | 2 | 3;

const DAY_START = toMinutes("09:00");
const DAY_END = toMinutes("21:30");
const SPAN = DAY_END - DAY_START;
const HOURS: [Minutes, string][] = [
  [9 * 60, "9 AM"],
  [12 * 60, "12 NN"],
  [15 * 60, "3 PM"],
  [18 * 60, "6 PM"],
  [21 * 60, "9 PM"],
];

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
const frac = (m: Minutes) => (Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / SPAN;
const pct = (m: Minutes) => `${frac(m) * 100}%`;
const spanStyle = (a: Minutes, b: Minutes) => ({ left: pct(a), width: `${(frac(b) - frac(a)) * 100}%` });
const roomName = (slug: string) => MINISTRY_ROOMS.find((r) => r.slug === slug)?.name ?? slug;
const shortName = (slug: string) => roomName(slug).split(" (")[0];
const duration = (a: Minutes, b: Minutes) => {
  const h = (b - a) / 60;
  return h === 1 ? "1 hour" : `${h % 1 ? h.toFixed(1) : h} hours`;
};

/** Minutes after midnight in Manila right now. */
const manilaNow = () => {
  const d = new Date();
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 8 * 60) % 1440;
};

const HATCH = "repeating-linear-gradient(135deg, var(--paper-deep) 0 6px, transparent 6px 12px)";

export function BookingFlow(props: { today: string; name: string; email: string; mobile: string }) {
  const [attempt, setAttempt] = useState(0);
  return <Request key={attempt} {...props} onAnother={() => setAttempt((a) => a + 1)} />;
}

function Request({
  today,
  name: initialName,
  email,
  mobile: initialMobile,
  onAnother,
}: {
  today: string;
  name: string;
  email: string;
  mobile: string;
  onAnother: () => void;
}) {
  const [state, action, sending] = useActionState<RoomRequestResult | null, FormData>(createRoomRequest, null);
  const e = state?.fieldErrors ?? {};

  const [step, setStep] = useState<StepId>(1);

  // 1. Find a room
  const [nowMinutes] = useState(manilaNow);
  const [date, setDate] = useState(() => firstOpenDay(today));
  const [week, setWeek] = useState(() => mondayOf(firstOpenDay(today)));
  const [start, setStart] = useState<Minutes | null>(null);
  const [end, setEnd] = useState<Minutes | null>(null);
  const [people, setPeople] = useState(20);
  const [setup, setSetup] = useState<Setup>("classroom");
  const [rooms, setRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ date: string; times: Busy } | null>(null);

  // 2. Event details
  const [activity, setActivity] = useState("");
  const [ministry, setMinistry] = useState("");
  const [ministryOther, setMinistryOther] = useState("");
  const [equipment, setEquipment] = useState<Record<string, number>>({});
  const [food, setFood] = useState("none");
  const [notes, setNotes] = useState("");

  // 3. Review
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [agreed, setAgreed] = useState(false);

  // What's already held on the chosen date. Refetched after a failed send,
  // in case someone else took a room in the meantime.
  useEffect(() => {
    let live = true;
    roomBusyTimes(date).then((times) => live && setBusy({ date, times }));
    return () => {
      live = false;
    };
  }, [date, state]);

  // A failed send goes back to the step that needs fixing.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const f = state?.fieldErrors;
    if (f && (f.rooms || f.date || f.time || f.setup || f.participants)) setStep(1);
    else if (f && (f.activity || f.ministry || f.food)) setStep(2);
  }

  const loaded = busy?.date === date;
  const timed = start !== null && end !== null;
  const earliest = date === today ? Math.ceil((nowMinutes + 1) / STEP_MINUTES) * STEP_MINUTES : DAY_START;

  const starts = useMemo(() => {
    const out: Minutes[] = [];
    for (let m = Math.max(DAY_START, earliest); m < DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [earliest]);
  const ends = useMemo(() => {
    const out: Minutes[] = [];
    if (start === null) return out;
    for (let m = start + STEP_MINUTES; m <= DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [start]);

  const heldFor = (slug: string) => (loaded ? busy!.times[slug] ?? [] : []);
  const setupInfo = SETUPS.find((s) => s.id === setup)!;

  /** Why a room can't be picked for the chosen time, or null when it can. */
  const blocked = (slug: string): string | null => {
    const cap = MINISTRY_ROOMS.find((r) => r.slug === slug)!.capacity[setup];
    if (!cap) return `No ${setupInfo.label.toLowerCase()} set-up`;
    if (!timed) return null;
    const why = closedReason(slug, date, start!, end!);
    if (why) return why;
    if (heldFor(slug).some(([a, b]) => a < end! && b > start!)) return "Taken at this time";
    return null;
  };

  const picked = timed ? rooms.filter((slug) => !blocked(slug)) : [];
  const seats = picked.reduce((n, slug) => n + (MINISTRY_ROOMS.find((r) => r.slug === slug)!.capacity[setup] ?? 0), 0);
  const ministryName = ministry === "Other" ? ministryOther.trim() : ministry;

  const pickDate = (d: string) => {
    setDate(d);
    if (d === today && start !== null && start < nowMinutes) {
      setStart(null);
      setEnd(null);
    }
  };
  const pickStart = (s: Minutes | null) => {
    setStart(s);
    if (s !== null && (end === null || end <= s)) setEnd(Math.min(s + 120, DAY_END));
  };
  /** Tapping a room's timeline: that room, from that half hour, keeping the length already chosen (two hours to start). */
  const pickFromTimeline = (slug: string, at: Minutes) => {
    const w = ministryWindow(slug, date);
    if (!w) return;
    const s = Math.max(w.from, earliest, Math.min(at, w.to - STEP_MINUTES));
    const keep = timed ? end! - start! : 120;
    setStart(s);
    setEnd(Math.min(s + keep, w.to));
    setRooms((r) => (r.includes(slug) ? r : [...r, slug]));
  };
  const toggleRoom = (slug: string) => setRooms((r) => (r.includes(slug) ? r.filter((s) => s !== slug) : [...r, slug]));

  const missingByStep: Record<StepId, string[]> = {
    1: [!timed && "a time", timed && !picked.length && "a room"].filter(Boolean) as string[],
    2: [!activity.trim() && "an event name", !ministryName && "your ministry"].filter(Boolean) as string[],
    3: [!name.trim() && "your name", mobile.replace(/\D/g, "").length < 7 && "a mobile number", !agreed && "the policies"].filter(
      Boolean,
    ) as string[],
  };
  const missing = missingByStep[step];

  if (state?.ok) {
    return (
      <Sent
        reference={state.reference ?? "—"}
        email={email}
        emailed={Boolean(state.emailed)}
        rows={[
          ["Event", activity],
          ["When", timed ? `${dateLong(date)}, ${timeLabel(start!)} to ${timeLabel(end!)}` : "—"],
          [picked.length > 1 ? "Rooms" : "Room", picked.map(roomName).join(", ")],
          ["People", String(people)],
        ]}
        onAnother={onAnother}
      />
    );
  }

  const goTo = (s: StepId) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevWeek = addDays(week, -7);
  const canPrev = addDays(prevWeek, 5) >= today;
  const days = Array.from({ length: 6 }, (_, i) => addDays(week, i));

  return (
    <form action={action} className="pb-36">
      {/* Everything the server needs, whichever step is showing. */}
      <input type="hidden" name="participants" value={people} />
      <input type="hidden" name="setup" value={setup} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={start === null ? "" : toHHMM(start)} />
      <input type="hidden" name="end" value={end === null ? "" : toHHMM(end)} />
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

      <div>
        <Progress step={step} onGo={goTo} />

        {step === 1 ? (
          <div className="mt-12 space-y-14">
            <Block title="When is it?" hint="Rooms can be requested Monday to Saturday. Include time to set up and pack up.">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.95rem] font-semibold text-ink">
                  {dayNum(days[0])} {monthOf(days[0])} to {dayNum(days[5])} {monthOf(days[5])}
                </p>
                <div className="flex gap-2">
                  <ArrowButton label="Previous week" disabled={!canPrev} onClick={() => setWeek(prevWeek)}>
                    &larr;
                  </ArrowButton>
                  <ArrowButton label="Next week" onClick={() => setWeek(addDays(week, 7))}>
                    &rarr;
                  </ArrowButton>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                {days.map((d) => {
                  const past = d < today;
                  const on = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={past}
                      aria-pressed={on}
                      onClick={() => pickDate(d)}
                      className={`flex flex-col items-center py-4 transition-colors ${
                        on
                          ? "bg-clay text-paper-bright"
                          : past
                            ? "cursor-not-allowed bg-paper-deep/50 text-ink-mute/50"
                            : "bg-paper-bright text-ink shadow-[inset_0_0_0_1px_var(--hairline)] hover:shadow-[inset_0_0_0_1px_var(--ink)]"
                      }`}
                    >
                      <span className={`text-[0.8rem] font-semibold ${on ? "text-paper-bright/85" : "text-ink-mute"}`}>
                        {d === today ? "Today" : WEEKDAY[weekdayOf(d)]}
                      </span>
                      <span className="font-display mt-1 text-3xl leading-none">{dayNum(d)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <Labelled label="Starts">
                  <select
                    value={start === null ? "" : String(start)}
                    onChange={(ev) => pickStart(ev.target.value ? Number(ev.target.value) : null)}
                    className={`${INPUT} w-40`}
                  >
                    <option value="">Choose</option>
                    {starts.map((m) => (
                      <option key={m} value={m}>
                        {timeLabel(m)}
                      </option>
                    ))}
                  </select>
                </Labelled>
                <span className="pb-3.5 text-ink-mute">to</span>
                <Labelled label="Ends">
                  <select
                    value={end === null ? "" : String(end)}
                    disabled={start === null}
                    onChange={(ev) => setEnd(ev.target.value ? Number(ev.target.value) : null)}
                    className={`${INPUT} w-40 disabled:text-ink-mute`}
                  >
                    <option value="">{start === null ? "—" : "Choose"}</option>
                    {ends.map((m) => (
                      <option key={m} value={m}>
                        {timeLabel(m)}
                      </option>
                    ))}
                  </select>
                </Labelled>
                {timed ? <span className="pb-3.5 text-[0.95rem] text-ink-mute">{duration(start!, end!)}</span> : null}
              </div>
              {e.date || e.time ? <Err>{e.date ?? e.time}</Err> : null}
            </Block>

            <Block title="How many people?" hint="Everyone: your team, volunteers, speakers and guests.">
              <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
                <div className="flex items-center gap-3">
                  <ArrowButton label="Five fewer people" disabled={people <= 1} onClick={() => setPeople((p) => Math.max(1, p - 5))}>
                    &minus;
                  </ArrowButton>
                  <input
                    aria-label="Number of people"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={people}
                    onChange={(ev) => setPeople(Math.max(1, Math.floor(Number(ev.target.value) || 1)))}
                    className="font-display w-20 bg-transparent text-center text-3xl tabular-nums text-ink [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <ArrowButton label="Five more people" onClick={() => setPeople((p) => p + 5)}>
                    +
                  </ArrowButton>
                </div>
                <div role="radiogroup" aria-label="Set-up" className="flex flex-wrap gap-2">
                  {SETUPS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={setup === s.id}
                      onClick={() => setSetup(s.id)}
                      className={`px-4 py-2.5 text-[0.95rem] transition-colors ${
                        setup === s.id
                          ? "bg-ink font-semibold text-paper-bright"
                          : "bg-paper-bright text-ink shadow-[inset_0_0_0_1px_var(--hairline)] hover:shadow-[inset_0_0_0_1px_var(--ink)]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[0.9rem] text-ink-mute">{setupInfo.hint}.</p>
              {e.participants || e.setup ? <Err>{e.participants ?? e.setup}</Err> : null}
            </Block>

            <Block
              title="Choose a room"
              hint={
                timed
                  ? `Showing ${dateLong(date)}. Tick a room, or tap a free time on it to move your booking there.`
                  : `Showing ${dateLong(date)}. Tap a free time on any room to start.`
              }
            >
              <RoomBoard
                date={date}
                setup={setup}
                selection={timed ? [start!, end!] : null}
                picked={picked}
                past={date === today ? earliest : DAY_START}
                heldFor={heldFor}
                blocked={blocked}
                timed={timed}
                onToggle={toggleRoom}
                onPick={pickFromTimeline}
              />
              {e.rooms ? <Err>{e.rooms}</Err> : null}
              {picked.length ? (
                <p className={`mt-5 text-[0.95rem] ${seats < people ? "text-sky" : "text-ink-soft"}`}>
                  {seats < people
                    ? `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats} with a ${setupInfo.label.toLowerCase()} set-up, fewer than your ${people}. Tick another room or change the set-up.`
                    : `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats}, enough for your ${people}.`}
                </p>
              ) : null}
            </Block>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-12 max-w-2xl space-y-14">
            <Block title="About your event" hint="So the facilities team can get the room ready for you.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField label="Event name" error={e.activity}>
                    <input value={activity} onChange={(ev) => setActivity(ev.target.value)} placeholder="e.g. Elevate core huddle" className={INPUT} />
                  </TextField>
                </div>
                <TextField label="Ministry" hint="The lead ministry, if several are involved." error={e.ministry}>
                  <select value={ministry} onChange={(ev) => setMinistry(ev.target.value)} className={INPUT}>
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
            </Block>

            <Block title="Equipment" hint="Optional. Tap what you'd like set up. We'll tell you if something isn't available on your date.">
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
            </Block>

            <Block title="Food">
              <div className="flex flex-wrap gap-2">
                {FOOD.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={food === f.id}
                    onClick={() => setFood(f.id)}
                    className={`px-4 py-2.5 text-[0.95rem] transition-colors ${
                      food === f.id
                        ? "bg-ink font-semibold text-paper-bright"
                        : "bg-paper-bright text-ink shadow-[inset_0_0_0_1px_var(--hairline)] hover:shadow-[inset_0_0_0_1px_var(--ink)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {FOOD.find((f) => f.id === food)?.hint ? (
                <p className="mt-3 text-[0.9rem] text-ink-mute">{FOOD.find((f) => f.id === food)!.hint}</p>
              ) : null}
              {e.food ? <Err>{e.food}</Err> : null}

              <div className="mt-8">
                <TextField label="Anything else?" hint="Optional. A special set-up, a repeating schedule, or anything the team should know.">
                  <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} className={INPUT} />
                </TextField>
              </div>
            </Block>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-12 max-w-2xl space-y-14">
            <Block title="Review your request" hint="The facilities team confirms by email.">
              <dl className="divide-y divide-hairline border-y border-hairline">
                {(
                  [
                    ["When", timed ? `${dateLong(date)}\n${timeLabel(start!)} to ${timeLabel(end!)}` : "—", 1],
                    [picked.length > 1 ? "Rooms" : "Room", `${picked.map(roomName).join(", ")}\nSeats ${seats}`, 1],
                    ["People", `${people}, ${setupInfo.label.toLowerCase()} set-up`, 1],
                    ["Event", `${activity}\n${ministryName}`, 2],
                    ["Equipment", equipmentSummary(equipment), 2],
                    ["Food", FOOD.find((f) => f.id === food)!.label, 2],
                    ...(notes.trim() ? [["Notes", notes.trim(), 2]] : []),
                  ] as [string, string, StepId][]
                ).map(([k, v, s]) => (
                  <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-start gap-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                    <dt className="text-[0.95rem] text-ink-mute">{k}</dt>
                    <dd className="whitespace-pre-line text-[1rem] leading-relaxed text-ink">{v}</dd>
                    <button type="button" onClick={() => goTo(s)} className="text-[0.9rem] font-semibold text-clay underline underline-offset-4">
                      Edit
                    </button>
                  </div>
                ))}
              </dl>
            </Block>

            <Block title="Your details" hint={`The confirmation goes to ${email}.`}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Name" error={e.name}>
                  <input value={name} onChange={(ev) => setName(ev.target.value)} autoComplete="name" className={INPUT} />
                </TextField>
                <TextField label="Mobile number" hint="For same-day changes." error={e.mobile}>
                  <input
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
            </Block>

            <Block title="Room policies">
              <details className="group bg-paper-bright shadow-[inset_0_0_0_1px_var(--hairline)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.98rem] text-ink [&::-webkit-details-marker]:hidden">
                  <span>Approval, priority, food, set-up time and more</span>
                  <span className="shrink-0 text-[0.9rem] font-semibold text-clay group-open:hidden">Read all {ROOM_POLICIES.length}</span>
                  <span className="hidden shrink-0 text-[0.9rem] font-semibold text-clay group-open:inline">Hide</span>
                </summary>
                <ul className="divide-y divide-hairline border-t border-hairline px-5">
                  {ROOM_POLICIES.map(([t, b]) => (
                    <li key={t} className="grid gap-1 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
                      <span className="text-[0.92rem] font-semibold text-ink">{t}</span>
                      <span className="text-[0.92rem] leading-relaxed text-ink-soft">{b}</span>
                    </li>
                  ))}
                </ul>
              </details>
              <label className="mt-3 flex cursor-pointer items-start gap-3 bg-paper-bright p-5 text-[0.98rem] text-ink shadow-[inset_0_0_0_1px_var(--hairline)] has-[:checked]:shadow-[inset_0_0_0_2px_var(--clay)]">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(ev) => setAgreed(ev.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--clay)]"
                />
                <span>I&rsquo;ve read the room policies and accept them on behalf of my ministry.</span>
              </label>
              {e.accept ? <Err>{e.accept}</Err> : null}
            </Block>
          </div>
        ) : null}
      </div>

      {/* The request so far and the next step, pinned to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper-bright/95 shadow-[0_-8px_24px_-12px_rgba(20,32,33,0.18)] backdrop-blur">
        <div className="mx-auto flex max-w-[82rem] items-center gap-4 px-5 py-3.5 sm:px-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goTo((step - 1) as StepId)}
              className="hidden shrink-0 px-2 text-[0.95rem] font-semibold text-ink-mute hover:text-ink sm:block"
            >
              &larr; Back
            </button>
          ) : null}
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goTo((step - 1) as StepId)}
              aria-label="Back"
              className="flex h-11 w-11 shrink-0 items-center justify-center text-ink shadow-[inset_0_0_0_1px_var(--hairline)] sm:hidden"
            >
              &larr;
            </button>
          ) : null}
          <div className="min-w-0 flex-1 leading-snug">
            {timed && picked.length ? (
              <>
                <span className="block truncate text-[0.98rem] font-semibold text-ink">{picked.map(shortName).join(" + ")}</span>
                <span className="block truncate text-[0.88rem] text-ink-mute">
                  {dateShort(date)} · {timeLabel(start!)} to {timeLabel(end!)} · {people} people
                </span>
              </>
            ) : (
              <span className="block truncate text-[0.92rem] text-ink-mute">
                {missing.length ? `Choose ${missing.join(" and ")}` : ""}
              </span>
            )}
            <Messages state={state} />
          </div>
          <div className="shrink-0">
            {step === 3 ? (
              <button type="submit" disabled={sending || missing.length > 0} className={PRIMARY}>
                {sending ? "Sending…" : "Send request"}
              </button>
            ) : (
              <button type="button" onClick={() => !missing.length && goTo((step + 1) as StepId)} disabled={missing.length > 0} className={PRIMARY}>
                Continue
              </button>
            )}
          </div>
        </div>
        {missing.length && step > 1 ? (
          <p className="mx-auto max-w-[82rem] px-5 pb-2.5 text-[0.8rem] text-ink-mute sm:px-8">Still needed: {missing.join(", ")}.</p>
        ) : null}
      </div>
    </form>
  );
}

/** Today, unless it's Sunday or the rooms are about to close; else the next open day. */
function firstOpenDay(today: string): string {
  if (weekdayOf(today) !== 0 && manilaNow() < DAY_END - 60) return today;
  let d = today;
  for (let i = 0; i < 7; i++) {
    d = addDays(d, 1);
    if (weekdayOf(d) !== 0) return d;
  }
  return d;
}

const INPUT =
  "w-full bg-paper-bright px-4 py-3 text-[1rem] text-ink shadow-[inset_0_0_0_1px_var(--hairline)] focus:shadow-[inset_0_0_0_2px_var(--clay)] focus:outline-none";
const PRIMARY =
  "btn-press label bg-clay px-6 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-40 sm:px-10";

/* --- The room board --------------------------------------------------------- */

/**
 * Every room on one shared timeline, 9:00 AM to 9:30 PM. One hour scale on
 * top; the chosen time runs down all the rooms as a single soft column; each
 * room's bar only shows what matters: closed (hatched), taken (grey), and the
 * time you've picked for it (teal). On phones each room stacks its own bar.
 */
function RoomBoard({
  date,
  setup,
  selection,
  picked,
  past,
  heldFor,
  blocked,
  timed,
  onToggle,
  onPick,
}: {
  date: string;
  setup: Setup;
  selection: [Minutes, Minutes] | null;
  picked: string[];
  past: Minutes;
  heldFor: (slug: string) => [Minutes, Minutes][];
  blocked: (slug: string) => string | null;
  timed: boolean;
  onToggle: (slug: string) => void;
  onPick: (slug: string, at: Minutes) => void;
}) {
  return (
    <div>
      {/* Hour scale, once */}
      <div className="grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-x-8">
        <span className="hidden md:block" />
        <div className="relative mb-2 h-5 text-[0.8rem] text-ink-mute">
          {HOURS.map(([m, t], i) => (
            <span
              key={t}
              className={`absolute whitespace-nowrap ${i === 0 ? "" : i === HOURS.length - 1 ? "-translate-x-3/4" : "-translate-x-1/2"}`}
              style={{ left: pct(m) }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* The chosen time, one column down every room (wide screens) */}
        {selection ? (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden md:left-[18rem] md:block">
            <span className="absolute inset-y-0 bg-clay/[0.07] shadow-[inset_1px_0_0_rgba(0,118,130,0.35),inset_-1px_0_0_rgba(0,118,130,0.35)]" style={spanStyle(selection[0], selection[1])} />
          </div>
        ) : null}

        <ul className="divide-y divide-hairline border-y border-hairline">
          {MINISTRY_ROOMS.map((r) => {
            const cap = r.capacity[setup];
            const why = blocked(r.slug);
            const on = picked.includes(r.slug);
            const open = ministryWindow(r.slug, date);
            const closed: [Minutes, Minutes][] = open
              ? [
                  [DAY_START, open.from],
                  [open.to, DAY_END],
                ]
              : [[DAY_START, DAY_END]];
            const usable = Boolean(cap) && Boolean(open);
            return (
              <li key={r.slug} className="grid gap-3 py-5 md:grid-cols-[16rem_minmax(0,1fr)] md:items-center md:gap-x-8">
                <button
                  type="button"
                  disabled={Boolean(why) || !timed}
                  aria-pressed={on}
                  onClick={() => onToggle(r.slug)}
                  className="group flex items-center gap-4 text-left disabled:cursor-default"
                >
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center text-[0.8rem] font-bold transition-colors ${
                      on
                        ? "bg-clay text-paper-bright"
                        : why || !timed
                          ? "bg-paper-deep/70"
                          : "bg-paper-bright shadow-[inset_0_0_0_1.5px_var(--ink-mute)] group-hover:shadow-[inset_0_0_0_1.5px_var(--ink)]"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[1.05rem] font-semibold ${why ? "text-ink-mute" : "text-ink"}`}>{r.name}</span>
                    <span className={`mt-0.5 block text-[0.88rem] ${on ? "text-clay" : "text-ink-mute"}`}>
                      {why ?? `Seats ${cap}${timed ? " · Free" : ""}`}
                    </span>
                  </span>
                </button>

                <div
                  aria-hidden
                  onClick={(ev) => {
                    if (!usable) return;
                    const box = ev.currentTarget.getBoundingClientRect();
                    const at = DAY_START + ((ev.clientX - box.left) / box.width) * SPAN;
                    onPick(r.slug, Math.floor(at / STEP_MINUTES) * STEP_MINUTES);
                  }}
                  className={`relative h-10 overflow-hidden ${usable ? "cursor-pointer bg-paper-bright hover:bg-paper-bright/70" : "bg-paper-deep/40"}`}
                >
                  {past > DAY_START ? <span className="absolute inset-y-0 bg-paper-deep/80" style={spanStyle(DAY_START, past)} /> : null}
                  {closed
                    .filter(([a, b]) => b > a)
                    .map(([a, b]) => (
                      <span key={`c${a}`} className="absolute inset-y-0" style={{ ...spanStyle(a, b), background: HATCH }} />
                    ))}
                  {heldFor(r.slug).map(([a, b]) => (
                    <span key={`h${a}`} className="absolute inset-y-2 bg-ink/25" style={spanStyle(a, b)} />
                  ))}
                  {on && selection ? <span className="absolute inset-y-0 bg-clay" style={spanStyle(selection[0], selection[1])} /> : null}
                  {/* On phones, the chosen time as an outline on each free room */}
                  {!on && !why && selection ? (
                    <span className="absolute inset-y-0 shadow-[inset_0_0_0_1.5px_var(--clay)] md:hidden" style={spanStyle(selection[0], selection[1])} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[0.85rem] text-ink-mute">
        <Swatch className="bg-paper-bright shadow-[inset_0_0_0_1px_var(--hairline)]">Free</Swatch>
        <Swatch className="bg-ink/25">Taken</Swatch>
        <Swatch style={{ background: HATCH }} className="shadow-[inset_0_0_0_1px_var(--hairline)]">
          Closed
        </Swatch>
        <Swatch className="bg-clay">Your booking</Swatch>
      </p>
    </div>
  );
}

function Swatch({ className = "", style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`h-3.5 w-5 ${className}`} style={style} />
      {children}
    </span>
  );
}

/* --- Pieces ----------------------------------------------------------------- */

function Progress({ step, onGo }: { step: StepId; onGo: (s: StepId) => void }) {
  const steps: [StepId, string][] = [
    [1, "Find a room"],
    [2, "Event details"],
    [3, "Review and send"],
  ];
  return (
    <ol className="grid grid-cols-3 gap-3">
      {steps.map(([n, label]) => {
        const done = n < step;
        const current = n === step;
        return (
          <li key={n}>
            <button
              type="button"
              disabled={!done}
              onClick={() => onGo(n)}
              aria-current={current ? "step" : undefined}
              className="w-full text-left disabled:cursor-default"
            >
              <span className={`block h-[3px] ${done || current ? "bg-clay" : "bg-hairline"}`} />
              <span className={`mt-3 block text-[0.95rem] ${current ? "font-semibold text-ink" : done ? "text-ink" : "text-ink-mute"}`}>
                <span className={`mr-1.5 tabular-nums ${current || done ? "text-clay" : ""}`}>{n}.</span>
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {hint ? <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-mute">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[0.85rem] font-semibold text-ink-mute">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function ArrowButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 shrink-0 items-center justify-center bg-paper-bright text-lg text-ink shadow-[inset_0_0_0_1px_var(--hairline)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--ink)] disabled:bg-transparent disabled:text-ink-mute/40 disabled:hover:shadow-[inset_0_0_0_1px_var(--hairline)]"
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
        className={`px-4 py-2.5 text-[0.95rem] transition-colors ${
          count
            ? "bg-ink font-semibold text-paper-bright"
            : "bg-paper-bright text-ink shadow-[inset_0_0_0_1px_var(--hairline)] hover:shadow-[inset_0_0_0_1px_var(--ink)]"
        }`}
      >
        {count ? "✓ " : ""}
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-stretch bg-ink text-[0.95rem] font-semibold text-paper-bright">
      <button type="button" aria-label={`One fewer ${label.toLowerCase()}`} onClick={() => onChange(count - 1)} className="px-3 hover:bg-paper-bright/15">
        &minus;
      </button>
      <span aria-live="polite" className="px-1 py-2.5 tabular-nums">
        {count} × {label}
      </span>
      <button
        type="button"
        aria-label={`One more ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, count + 1))}
        disabled={count >= max}
        className="px-3 hover:bg-paper-bright/15 disabled:text-paper-bright/30"
      >
        +
      </button>
    </span>
  );
}

function Messages({ state }: { state: RoomRequestResult | null }) {
  if (!state || state.ok) return null;
  const text = state.formError ?? (state.fieldErrors ? "Something needs fixing. It's marked above." : null);
  if (!text) return null;
  return (
    <span role="alert" className="mt-0.5 block text-[0.85rem] text-sky">
      {text}
      {state.needsAuth ? (
        <>
          {" "}
          <Link href="/sign-in?next=/centris/reserve" className="underline underline-offset-4">
            Sign in
          </Link>
        </>
      ) : null}
    </span>
  );
}

function TextField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[0.9rem] font-semibold text-ink">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[0.85rem] text-ink-mute">{hint}</span> : null}
      {error ? <Err>{error}</Err> : null}
    </label>
  );
}

function Err({ children }: { children: ReactNode }) {
  return (
    <span role="alert" className="mt-2 block text-[0.9rem] text-sky">
      {children}
    </span>
  );
}

function Sent({
  reference,
  email,
  emailed,
  rows,
  onAnother,
}: {
  reference: string;
  email: string;
  emailed: boolean;
  rows: [string, string][];
  onAnother: () => void;
}) {
  const steps: [string, string, boolean][] = [
    ["Request sent", emailed ? `A copy is in ${email}.` : "Saved under My reservations.", true],
    ["The facilities team reviews it", "Your rooms are held for you while they check.", false],
    ["You get a confirmation email", "Then it's safe to announce your event.", false],
  ];
  return (
    <div role="status" className="grid gap-12 bg-paper-bright p-8 shadow-[inset_0_0_0_1px_var(--hairline)] sm:p-12 lg:grid-cols-2">
      <div>
        <span aria-hidden className="flex h-12 w-12 items-center justify-center bg-clay text-xl font-bold text-paper-bright">
          ✓
        </span>
        <h2 className="font-display mt-6 text-3xl leading-tight text-ink sm:text-4xl">Request sent.</h2>
        <p className="mt-2 text-ink-mute">
          Reference <span className="font-semibold tabular-nums text-ink">{reference}</span>
        </p>
        <dl className="mt-7 divide-y divide-hairline border-y border-hairline text-[0.98rem]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-3">
              <dt className="text-ink-mute">{k}</dt>
              <dd className="text-right text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="font-display text-xl text-ink">What happens next</h3>
        <ol className="mt-5 space-y-6">
          {steps.map(([t, b, done], i) => (
            <li key={t} className="flex gap-4">
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center text-[0.85rem] font-bold ${
                  done ? "bg-clay text-paper-bright" : "text-ink-mute shadow-[inset_0_0_0_1px_var(--hairline)]"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span>
                <span className="block font-semibold text-ink">{t}</span>
                <span className="mt-0.5 block text-[0.92rem] text-ink-mute">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-9 flex flex-wrap gap-6">
          <Link href="/my/reservations" className="text-[0.95rem] font-semibold text-clay underline underline-offset-4">
            See my requests
          </Link>
          <button type="button" onClick={onAnother} className="text-[0.95rem] font-semibold text-clay underline underline-offset-4">
            Request another room
          </button>
        </div>
      </div>
    </div>
  );
}
