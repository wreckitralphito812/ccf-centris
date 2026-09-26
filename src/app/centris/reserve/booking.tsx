"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
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
 *   1. Find a room: a search bar (people, set-up, from, to), a strip of dates,
 *      and every room with a timeline of its day, so what's free, closed or
 *      taken is visible at a glance. Tapping a free spot on a timeline picks
 *      that room and time at once.
 *   2. Event details: name, ministry, equipment, food.
 *   3. Review and send: the whole request with Edit links, contact details
 *      from the account, and one tick for the policies.
 *
 * A summary with the next action sits beside the steps on desktop and in a bar
 * along the bottom on phones. Every rule is checked again on the server.
 */

type Busy = Record<string, [Minutes, Minutes][]>;
type StepId = 1 | 2 | 3;

const DAY_START = toMinutes("09:00");
const DAY_END = toMinutes("21:30");
const SPAN = DAY_END - DAY_START;
const DATE_STRIP_DAYS = 21;

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dateLong = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAY_LONG[weekdayOf(date)]}, ${d} ${MONTH_LONG[m - 1]}`;
};
const pct = (m: Minutes) => `${((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / SPAN) * 100}%`;
const roomName = (slug: string) => MINISTRY_ROOMS.find((r) => r.slug === slug)?.name ?? slug;
const duration = (a: Minutes, b: Minutes) => {
  const h = (b - a) / 60;
  return h === 1 ? "1 hour" : `${h % 1 ? h.toFixed(1) : h} hours`;
};

/** Minutes after midnight in Manila right now. */
const manilaNow = () => {
  const d = new Date();
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 8 * 60) % 1440;
};

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
  const [people, setPeople] = useState(20);
  const [setup, setSetup] = useState<Setup>("classroom");
  const [date, setDate] = useState(() => firstOpenDay(today));
  const [start, setStart] = useState<Minutes | null>(null);
  const [end, setEnd] = useState<Minutes | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ date: string; times: Busy } | null>(null);
  // Captured once, so "past" times don't shift under the user mid-render.
  const [nowMinutes] = useState(manilaNow);

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

  const sunday = weekdayOf(date) === 0;
  const loaded = busy?.date === date;
  const timed = start !== null && end !== null && !sunday;
  const earliest = date === today ? Math.ceil((nowMinutes + 1) / STEP_MINUTES) * STEP_MINUTES : DAY_START;

  const starts = useMemo(() => {
    const out: Minutes[] = [];
    if (sunday) return out;
    for (let m = Math.max(DAY_START, earliest); m < DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [sunday, earliest]);
  const ends = useMemo(() => {
    const out: Minutes[] = [];
    if (start === null) return out;
    for (let m = start + STEP_MINUTES; m <= DAY_END; m += STEP_MINUTES) out.push(m);
    return out;
  }, [start]);

  const heldFor = (slug: string) => (loaded ? busy!.times[slug] ?? [] : []);

  /** Why a room can't be picked for the chosen time, or null when it can. */
  const blocked = (slug: string): string | null => {
    const cap = MINISTRY_ROOMS.find((r) => r.slug === slug)!.capacity[setup];
    if (!cap) return `No ${SETUPS.find((s) => s.id === setup)!.label.toLowerCase()} set-up`;
    if (sunday) return "Closed on Sundays";
    if (!timed) return null;
    const why = closedReason(slug, date, start!, end!);
    if (why) return why;
    if (heldFor(slug).some(([a, b]) => a < end! && b > start!)) return "Taken at this time";
    return null;
  };

  const picked = timed ? rooms.filter((slug) => !blocked(slug)) : [];
  const seats = picked.reduce((n, slug) => n + (MINISTRY_ROOMS.find((r) => r.slug === slug)!.capacity[setup] ?? 0), 0);
  const ministryName = ministry === "Other" ? ministryOther.trim() : ministry;
  const setupLabel = SETUPS.find((s) => s.id === setup)!.label;

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
  /** Tapping a timeline: that room, from that half hour, keeping the length already chosen (two hours to start). */
  const pickFromTimeline = (slug: string, at: Minutes) => {
    const w = ministryWindow(slug, date);
    if (!w) return;
    const s = Math.max(w.from, earliest, Math.min(at, w.to - STEP_MINUTES));
    const keep = start !== null && end !== null ? end - start : 120;
    setStart(s);
    setEnd(Math.min(s + keep, w.to));
    setRooms((r) => (r.includes(slug) ? r : [...r, slug]));
  };
  const toggleRoom = (slug: string) =>
    setRooms((r) => (r.includes(slug) ? r.filter((s) => s !== slug) : [...r, slug]));

  const step1Missing = [!timed && "a date and time", timed && !picked.length && "a room"].filter(Boolean) as string[];
  const step2Missing = [!activity.trim() && "an event name", !ministryName && "your ministry"].filter(Boolean) as string[];
  const step3Missing = [
    !name.trim() && "your name",
    mobile.replace(/\D/g, "").length < 7 && "a mobile number",
    !agreed && "the policies",
  ].filter(Boolean) as string[];
  const missing = step === 1 ? step1Missing : step === 2 ? step2Missing : step3Missing;

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
  const next = () => {
    if (!missing.length && step < 3) goTo((step + 1) as StepId);
  };

  const summary: [string, string][] = [
    ["When", timed ? `${dateLong(date)}\n${timeLabel(start!)} to ${timeLabel(end!)}` : "—"],
    [picked.length > 1 ? "Rooms" : "Room", picked.length ? picked.map(roomName).join(",\n") : "—"],
    ["People", `${people}, ${setupLabel.toLowerCase()}`],
    ["Event", activity.trim() || "—"],
    ["Equipment", equipmentSummary(equipment)],
  ];

  return (
    <form action={action} className="pb-28 lg:pb-0">
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

      <Progress step={step} onGo={goTo} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          {step === 1 ? (
            <div className="space-y-8">
              {/* The search bar */}
              <div>
                <div className="grid grid-cols-2 border border-hairline bg-paper-bright sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <Cell label="People" className="border-b border-r border-hairline sm:border-b-0">
                    <div className="flex items-center gap-1">
                      <StepButton label="Five fewer people" onClick={() => setPeople((p) => Math.max(1, p - 5))} disabled={people <= 1}>
                        &minus;
                      </StepButton>
                      <input
                        aria-label="Number of people"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={people}
                        onChange={(ev) => setPeople(Math.max(1, Math.floor(Number(ev.target.value) || 1)))}
                        className="w-12 bg-transparent text-center text-[1.05rem] font-semibold tabular-nums text-ink [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <StepButton label="Five more people" onClick={() => setPeople((p) => p + 5)}>
                        +
                      </StepButton>
                    </div>
                  </Cell>
                  <Cell label="Set-up" className="border-b border-hairline sm:border-b-0 sm:border-r">
                    <select
                      aria-label="Set-up"
                      value={setup}
                      onChange={(ev) => setSetup(ev.target.value as Setup)}
                      className="w-full cursor-pointer bg-transparent text-[1.05rem] font-semibold text-ink focus:outline-none"
                    >
                      {SETUPS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Cell>
                  <Cell label="From" className="border-r border-hairline">
                    <select
                      aria-label="Start time"
                      value={start === null ? "" : String(start)}
                      disabled={sunday}
                      onChange={(ev) => pickStart(ev.target.value ? Number(ev.target.value) : null)}
                      className="w-full cursor-pointer bg-transparent text-[1.05rem] font-semibold text-ink focus:outline-none disabled:text-ink-mute"
                    >
                      <option value="">Start</option>
                      {starts.map((m) => (
                        <option key={m} value={m}>
                          {timeLabel(m)}
                        </option>
                      ))}
                    </select>
                  </Cell>
                  <Cell label="To">
                    <select
                      aria-label="End time"
                      value={end === null ? "" : String(end)}
                      disabled={start === null}
                      onChange={(ev) => setEnd(ev.target.value ? Number(ev.target.value) : null)}
                      className="w-full cursor-pointer bg-transparent text-[1.05rem] font-semibold text-ink focus:outline-none disabled:text-ink-mute"
                    >
                      <option value="">End</option>
                      {ends.map((m) => (
                        <option key={m} value={m}>
                          {timeLabel(m)}
                        </option>
                      ))}
                    </select>
                  </Cell>
                </div>
                <p className="mt-2 text-[0.85rem] text-ink-mute">
                  {SETUPS.find((s) => s.id === setup)!.hint}. Count everyone, and include time to set up and pack up.
                </p>
                {e.participants || e.setup ? <Err>{e.participants ?? e.setup}</Err> : null}
              </div>

              <DateStrip today={today} date={date} onPick={pickDate} />
              {e.date || e.time ? <Err>{e.date ?? e.time}</Err> : null}

              <section aria-labelledby="rooms-h">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 id="rooms-h" className="font-display text-xl text-ink">
                    {sunday ? "Closed on Sundays" : dateLong(date)}
                  </h2>
                  <p className="text-[0.88rem] text-ink-mute">
                    {sunday
                      ? "Sundays are for the services. Pick another day."
                      : timed
                        ? `${timeLabel(start!)} to ${timeLabel(end!)} · ${duration(start!, end!)}`
                        : "Tap a free time on any room, or set From and To above."}
                  </p>
                </div>

                <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
                  {MINISTRY_ROOMS.map((r) => {
                    const cap = r.capacity[setup];
                    const why = blocked(r.slug);
                    const on = picked.includes(r.slug);
                    return (
                      <li key={r.slug} className={`px-2 py-4 transition-colors sm:px-3 ${on ? "bg-clay/[0.05]" : ""}`}>
                        <div className="grid gap-3 sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-start sm:gap-6">
                          <button
                            type="button"
                            disabled={Boolean(why) || !timed}
                            aria-pressed={on}
                            onClick={() => toggleRoom(r.slug)}
                            className="group flex items-start gap-3 text-left disabled:cursor-default"
                          >
                            <span
                              aria-hidden
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[0.72rem] font-bold transition-colors ${
                                on
                                  ? "border-clay bg-clay text-paper-bright"
                                  : why || !timed
                                    ? "border-hairline bg-paper-deep/60"
                                    : "border-ink/40 bg-paper-bright group-hover:border-ink"
                              }`}
                            >
                              {on ? "✓" : ""}
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-[1.02rem] font-semibold leading-snug ${why ? "text-ink-mute" : "text-ink"}`}>
                                {r.name}
                              </span>
                              <span className={`mt-0.5 block text-[0.84rem] leading-snug ${on ? "text-clay" : "text-ink-mute"}`}>
                                {why ?? `Seats ${cap}${timed ? " · Free" : ""}`}
                              </span>
                            </span>
                          </button>
                          <Timeline
                            open={ministryWindow(r.slug, date)}
                            held={heldFor(r.slug)}
                            past={date === today ? earliest : DAY_START}
                            selection={timed && (on || !why) ? [start!, end!] : null}
                            selected={on}
                            disabled={!cap || sunday}
                            onPick={(m) => pickFromTimeline(r.slug, m)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Legend />
                {e.rooms ? <Err>{e.rooms}</Err> : null}

                {picked.length ? (
                  <p className={`mt-5 border-l-2 pl-3 text-[0.92rem] ${seats < people ? "border-sky text-sky" : "border-clay text-ink-soft"}`}>
                    {seats < people
                      ? `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats} with a ${setupLabel.toLowerCase()} set-up, fewer than your ${people}. Tick another room or change the set-up.`
                      : `${picked.length > 1 ? "These rooms seat" : "This room seats"} ${seats}, enough for your ${people}.`}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-9">
              <StepHead title="About your event" body="So the facilities team can get the room ready for you." />
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

              <div>
                <p className="label text-clay">Equipment</p>
                <p className="mt-1 text-[0.85rem] text-ink-mute">Optional. Tap what you&rsquo;d like set up.</p>
                <div className="mt-3 flex flex-wrap gap-2">
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
              </div>

              <div>
                <p className="label text-clay">Food</p>
                <div className="mt-3 inline-flex max-w-full flex-wrap border border-hairline bg-paper-bright">
                  {FOOD.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={food === f.id}
                      onClick={() => setFood(f.id)}
                      className={`px-4 py-2.5 text-[0.95rem] transition-colors ${i ? "border-l border-hairline" : ""} ${
                        food === f.id ? "bg-clay font-semibold text-paper-bright" : "text-ink hover:bg-paper-deep"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {FOOD.find((f) => f.id === food)?.hint ? (
                  <p className="mt-2 text-[0.85rem] text-ink-mute">{FOOD.find((f) => f.id === food)!.hint}</p>
                ) : null}
                {e.food ? <Err>{e.food}</Err> : null}
              </div>

              <TextField label="Anything else?" hint="Optional. A special set-up, a repeating schedule, or anything the team should know.">
                <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} className={INPUT} />
              </TextField>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-9">
              <StepHead title="Review and send" body="Check the details. The facilities team confirms by email." />

              <dl className="divide-y divide-hairline border-y border-hairline">
                {(
                  [
                    ["When", timed ? `${dateLong(date)}, ${timeLabel(start!)} to ${timeLabel(end!)}` : "—", 1],
                    [picked.length > 1 ? "Rooms" : "Room", `${picked.map(roomName).join(", ")} · seats ${seats}`, 1],
                    ["People", `${people}, ${setupLabel.toLowerCase()} set-up`, 1],
                    ["Event", `${activity} · ${ministryName}`, 2],
                    ["Equipment", equipmentSummary(equipment), 2],
                    ["Food", FOOD.find((f) => f.id === food)!.label, 2],
                    ...(notes.trim() ? [["Notes", notes.trim(), 2]] : []),
                  ] as [string, string, StepId][]
                ).map(([k, v, s]) => (
                  <div key={k} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                    <dt className="label text-ink-mute">{k}</dt>
                    <dd className="text-[0.98rem] text-ink">{v}</dd>
                    <button type="button" onClick={() => goTo(s)} className="label text-clay underline underline-offset-4">
                      Edit
                    </button>
                  </div>
                ))}
              </dl>

              <div>
                <p className="label text-clay">Your details</p>
                <p className="mt-1 text-[0.85rem] text-ink-mute">The confirmation goes to {email}.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
              </div>

              <div>
                <details className="group border border-hairline bg-paper-bright">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[0.98rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    Room policies
                    <span className="label text-clay group-open:hidden">Read all {ROOM_POLICIES.length}</span>
                    <span className="label hidden text-clay group-open:inline">Hide</span>
                  </summary>
                  <ul className="divide-y divide-hairline border-t border-hairline px-4">
                    {ROOM_POLICIES.map(([t, b]) => (
                      <li key={t} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                        <span className="text-[0.92rem] font-semibold text-ink">{t}</span>
                        <span className="text-[0.9rem] leading-relaxed text-ink-soft">{b}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                <label className="mt-3 flex cursor-pointer items-start gap-3 border border-hairline bg-paper-bright p-4 text-[0.95rem] text-ink has-[:checked]:border-clay">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(ev) => setAgreed(ev.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--clay)]"
                  />
                  <span>I&rsquo;ve read the room policies and accept them on behalf of my ministry.</span>
                </label>
                {e.accept ? <Err>{e.accept}</Err> : null}
              </div>
            </div>
          ) : null}

          {step > 1 ? (
            <div className="mt-10 hidden border-t border-hairline pt-6 lg:block">
              <button type="button" onClick={() => goTo((step - 1) as StepId)} className="label text-ink-mute hover:text-ink">
                &larr; Back
              </button>
            </div>
          ) : null}
        </div>

        {/* Summary beside the steps on desktop */}
        <aside className="hidden border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28 lg:block">
          <p className="label text-clay">Your request</p>
          <dl className="mt-4 divide-y divide-hairline border-y border-hairline text-[0.93rem]">
            {summary.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="label shrink-0 text-ink-mute">{k}</dt>
                <dd className={`whitespace-pre-line text-right ${v === "—" || v === "None" ? "text-ink-mute" : "text-ink"}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <Messages state={state} />
          <Primary step={step} missing={missing} sending={sending} onNext={next} />
          <p className="mt-3 text-[0.82rem] leading-relaxed text-ink-mute">
            {missing.length
              ? `Still needed: ${missing.join(", ")}.`
              : step === 3
                ? "Rooms are free for ministries."
                : "You can review everything before sending."}
          </p>
        </aside>
      </div>

      {/* Summary as a bar along the bottom on phones and tablets */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper-bright/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goTo((step - 1) as StepId)}
              aria-label="Back"
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-ink"
            >
              &larr;
            </button>
          ) : null}
          <div className="min-w-0 flex-1 text-[0.85rem] leading-snug">
            {timed && picked.length ? (
              <>
                <span className="block truncate font-semibold text-ink">{picked.map((s) => roomName(s).split(" (")[0]).join(", ")}</span>
                <span className="block truncate text-ink-mute">
                  {WEEKDAY[weekdayOf(date)]} {Number(date.slice(8))} {MONTH[Number(date.slice(5, 7)) - 1]} · {timeLabel(start!)}–{timeLabel(end!)}
                </span>
              </>
            ) : (
              <span className="block text-ink-mute">{missing.length ? `Still needed: ${missing.join(", ")}` : ""}</span>
            )}
            <Messages state={state} compact />
          </div>
          <div className="w-36 shrink-0">
            <Primary step={step} missing={missing} sending={sending} onNext={next} compact />
          </div>
        </div>
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
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[1rem] text-ink focus:border-clay focus:outline-none";

/* --- Pieces ----------------------------------------------------------------- */

function Progress({ step, onGo }: { step: StepId; onGo: (s: StepId) => void }) {
  const steps: [StepId, string][] = [
    [1, "Find a room"],
    [2, "Event details"],
    [3, "Review and send"],
  ];
  return (
    <ol className="grid grid-cols-3 gap-2">
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
              <span className={`block h-1 ${done || current ? "bg-clay" : "bg-hairline"}`} />
              <span className={`label mt-2.5 block ${current ? "text-clay" : done ? "text-ink" : "text-ink-mute"}`}>
                Step {n}
              </span>
              <span className={`mt-0.5 block text-[0.92rem] ${current ? "font-semibold text-ink" : "text-ink-mute"}`}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Cell({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`px-4 py-3 ${className}`}>
      <span className="label block text-ink-mute">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center border border-hairline text-lg text-ink transition-colors hover:border-ink disabled:text-ink-mute/40 disabled:hover:border-hairline"
    >
      {children}
    </button>
  );
}

function DateStrip({ today, date, onPick }: { today: string; date: string; onPick: (d: string) => void }) {
  const days = Array.from({ length: DATE_STRIP_DAYS }, (_, i) => addDays(today, i));
  const inStrip = days.includes(date);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="label text-ink-mute">Date</p>
        <label className="label relative cursor-pointer text-clay underline underline-offset-4">
          Pick a later date
          <input
            type="date"
            min={today}
            value={date}
            onChange={(ev) => ev.target.value && onPick(ev.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
      <div className="no-bar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {!inStrip ? <DayChip date={date} on onPick={onPick} /> : null}
        {days.map((d) => (
          <DayChip key={d} date={d} on={d === date} onPick={onPick} today={d === today} />
        ))}
      </div>
    </div>
  );
}

function DayChip({ date, on, onPick, today = false }: { date: string; on: boolean; onPick: (d: string) => void; today?: boolean }) {
  const wd = weekdayOf(date);
  const closed = wd === 0;
  const d = Number(date.slice(8));
  const month = MONTH[Number(date.slice(5, 7)) - 1];
  return (
    <button
      type="button"
      onClick={() => onPick(date)}
      disabled={closed}
      aria-pressed={on}
      aria-label={`${WEEKDAY_LONG[wd]} ${d} ${month}${closed ? ", closed for services" : ""}`}
      className={`flex w-[4.25rem] shrink-0 flex-col items-center border py-2.5 transition-colors ${
        on
          ? "border-clay bg-clay text-paper-bright"
          : closed
            ? "cursor-not-allowed border-transparent bg-paper-deep/60 text-ink-mute/60"
            : "border-hairline bg-paper-bright text-ink hover:border-ink"
      }`}
    >
      <span className="label">{today ? "Today" : WEEKDAY[wd]}</span>
      <span className="font-display mt-1 text-2xl leading-none">{d}</span>
      <span className={`mt-1 text-[0.75rem] ${on ? "text-paper-bright/80" : "text-ink-mute"}`}>{closed ? "Closed" : month}</span>
    </button>
  );
}

/**
 * One room's day from 9:00 AM to 9:30 PM: closed hours hatched, held times
 * solid, past times faded, and the chosen time outlined. Tapping a free spot
 * picks that time for this room. Keyboard users set the time with From and To.
 */
function Timeline({
  open,
  held,
  past,
  selection,
  selected,
  disabled,
  onPick,
}: {
  open: { from: Minutes; to: Minutes } | null;
  held: [Minutes, Minutes][];
  past: Minutes;
  selection: [Minutes, Minutes] | null;
  selected: boolean;
  disabled: boolean;
  onPick: (m: Minutes) => void;
}) {
  const closed: [Minutes, Minutes][] = open
    ? [
        [DAY_START, open.from],
        [open.to, DAY_END],
      ]
    : [[DAY_START, DAY_END]];
  const clickable = !disabled && Boolean(open);
  const span = (a: Minutes, b: Minutes) => ({ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` });

  return (
    <div aria-hidden>
      <div
        onClick={(ev) => {
          if (!clickable) return;
          const box = ev.currentTarget.getBoundingClientRect();
          const at = DAY_START + ((ev.clientX - box.left) / box.width) * SPAN;
          onPick(Math.floor(at / STEP_MINUTES) * STEP_MINUTES);
        }}
        className={`relative h-9 overflow-hidden border border-hairline ${disabled ? "bg-paper-deep/40" : "bg-paper-bright"} ${
          clickable ? "cursor-pointer hover:border-ink/40" : ""
        }`}
      >
        {[12, 15, 18, 21].map((h) => (
          <span key={h} className="absolute inset-y-0 w-px bg-hairline" style={{ left: pct(h * 60) }} />
        ))}
        {past > DAY_START ? <span className="absolute inset-y-0 bg-paper-deep" style={span(DAY_START, past)} /> : null}
        {closed
          .filter(([a, b]) => b > a)
          .map(([a, b]) => (
            <span
              key={`c${a}`}
              className="absolute inset-y-0"
              style={{
                ...span(a, b),
                background: "repeating-linear-gradient(135deg, var(--paper-deep) 0 5px, var(--paper-bright) 5px 10px)",
              }}
            />
          ))}
        {held.map(([a, b]) => (
          <span key={`h${a}`} className="absolute inset-y-1.5 bg-ink/30" style={span(a, b)} />
        ))}
        {selection ? (
          <span
            className={`absolute inset-y-0 border-2 border-clay ${selected ? "bg-clay/75" : "bg-clay/10"}`}
            style={span(selection[0], selection[1])}
          />
        ) : null}
      </div>
      <div className="relative mt-1 h-4 text-[0.7rem] text-ink-mute">
        {(
          [
            [9 * 60, "9 AM"],
            [12 * 60, "12 NN"],
            [15 * 60, "3 PM"],
            [18 * 60, "6 PM"],
            [21 * 60, "9 PM"],
          ] as [Minutes, string][]
        ).map(([m, t], i) => (
          <span key={t} className={`absolute whitespace-nowrap ${i === 0 ? "" : i === 4 ? "-translate-x-3/4" : "-translate-x-1/2"}`} style={{ left: pct(m) }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const item = (swatch: ReactNode, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {text}
    </span>
  );
  return (
    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem] text-ink-mute">
      {item(<span className="h-3 w-4 border border-hairline bg-paper-bright" />, "Free")}
      {item(<span className="h-3 w-4 bg-ink/30" />, "Taken")}
      {item(
        <span
          className="h-3 w-4 border border-hairline"
          style={{ background: "repeating-linear-gradient(135deg, var(--paper-deep) 0 3px, var(--paper-bright) 3px 6px)" }}
        />,
        "Closed",
      )}
      {item(<span className="h-3 w-4 border-2 border-clay bg-clay/75" />, "Your time")}
    </p>
  );
}

function EquipmentChip({ label, max, count, onChange }: { label: string; max: number; count: number; onChange: (n: number) => void }) {
  if (!count || max === 1) {
    return (
      <button
        type="button"
        aria-pressed={Boolean(count)}
        onClick={() => onChange(count ? 0 : 1)}
        className={`border px-4 py-2 text-[0.95rem] transition-colors ${
          count ? "border-clay bg-clay/[0.06] font-semibold text-clay" : "border-hairline bg-paper-bright text-ink hover:border-ink"
        }`}
      >
        {count ? "✓ " : "+ "}
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-stretch border border-clay bg-clay/[0.06] text-[0.95rem] font-semibold text-clay">
      <button type="button" aria-label={`One fewer ${label.toLowerCase()}`} onClick={() => onChange(count - 1)} className="px-3 hover:bg-clay/10">
        &minus;
      </button>
      <span aria-live="polite" className="px-1 py-2 tabular-nums">
        {count} × {label}
      </span>
      <button
        type="button"
        aria-label={`One more ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, count + 1))}
        disabled={count >= max}
        className="px-3 hover:bg-clay/10 disabled:text-clay/30"
      >
        +
      </button>
    </span>
  );
}

function Primary({
  step,
  missing,
  sending,
  onNext,
  compact = false,
}: {
  step: StepId;
  missing: string[];
  sending: boolean;
  onNext: () => void;
  compact?: boolean;
}) {
  const cls = `btn-press label w-full border border-clay bg-clay text-paper-bright transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-45 ${
    compact ? "px-3 py-3" : "mt-5 px-6 py-4"
  }`;
  if (step === 3) {
    return (
      <button type="submit" disabled={sending || missing.length > 0} className={cls}>
        {sending ? "Sending…" : "Send request"}
      </button>
    );
  }
  return (
    <button type="button" onClick={onNext} disabled={missing.length > 0} className={cls}>
      Continue
    </button>
  );
}

function Messages({ state, compact = false }: { state: RoomRequestResult | null; compact?: boolean }) {
  if (!state || state.ok) return null;
  const text = state.formError ?? (state.fieldErrors ? "Something needs fixing. It's marked in the form." : null);
  if (!text) return null;
  return (
    <span role="alert" className={`block text-sky ${compact ? "mt-0.5 text-[0.8rem]" : "mt-4 border-l-2 border-sky pl-3 text-[0.9rem]"}`}>
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

function StepHead({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mt-1 text-[0.95rem] text-ink-mute">{body}</p>
    </div>
  );
}

function TextField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label text-clay">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[0.82rem] text-ink-mute">{hint}</span> : null}
      {error ? <Err>{error}</Err> : null}
    </label>
  );
}

function Err({ children }: { children: ReactNode }) {
  return (
    <span role="alert" className="mt-1.5 block text-[0.88rem] text-sky">
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
    <div role="status" className="grid gap-10 border border-hairline bg-paper-bright p-7 sm:p-10 lg:grid-cols-2">
      <div>
        <span aria-hidden className="flex h-11 w-11 items-center justify-center bg-clay text-xl font-bold text-paper-bright">
          ✓
        </span>
        <h2 className="font-display mt-5 text-3xl leading-tight text-ink sm:text-4xl">Request sent.</h2>
        <p className="mt-2 text-ink-mute">
          Reference <span className="font-semibold tabular-nums text-ink">{reference}</span>
        </p>
        <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-[0.95rem]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="label text-ink-mute">{k}</dt>
              <dd className="text-right text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="label text-clay">What happens next</p>
        <ol className="mt-4 space-y-5">
          {steps.map(([t, b, done], i) => (
            <li key={t} className="flex gap-4">
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center border text-[0.8rem] font-bold ${
                  done ? "border-clay bg-clay text-paper-bright" : "border-hairline text-ink-mute"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span>
                <span className="block font-semibold text-ink">{t}</span>
                <span className="mt-0.5 block text-[0.9rem] text-ink-mute">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-5">
          <Link href="/my/reservations" className="label text-clay underline underline-offset-4">
            See my requests
          </Link>
          <button type="button" onClick={onAnother} className="label text-clay underline underline-offset-4 hover:text-clay-deep">
            Request another room
          </button>
        </div>
      </div>
    </div>
  );
}
