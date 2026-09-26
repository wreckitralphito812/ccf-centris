"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoomRequest, roomBusyTimes, type RoomRequestResult } from "@/app/actions/reservations";
import { Err, Field, inputClass } from "@/app/reserve/dgroup/booking-form";
import {
  EQUIPMENT,
  FOOD,
  MINISTRIES,
  MINISTRY_ROOMS,
  SETUPS,
  STEP_MINUTES,
  closedReason,
  dayWindow,
  equipmentSummary,
  timeLabel,
  toHHMM,
  weekdayOf,
  type Minutes,
  type Setup,
} from "@/lib/ministry-rooms";
import { ROOM_POLICIES } from "./policies";

/**
 * A ministry's room request, rebuilt from CCF Centris's Venue Reservation
 * Form. What it does differently: the requester's name and email come from
 * their account; it asks for headcount and set-up first, so each room shows
 * the seats it has for that set-up; it only offers times the rooms are open
 * and greys out rooms already held; equipment is a count, not a list of
 * near-duplicate boxes; and one tick accepts the policies.
 *
 * One page, numbered sections, and a summary beside the Send button, like the
 * Dgroup table form. Every rule is checked again on the server.
 */

type Busy = Record<string, [Minutes, Minutes][]>;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dateLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAY[weekdayOf(date)]}, ${d} ${MONTH[m - 1]}`;
}

export function BookingFlow(props: { today: string; name: string; email: string; mobile: string }) {
  const [attempt, setAttempt] = useState(0);
  return <Request key={attempt} {...props} onAnother={() => setAttempt((a) => a + 1)} />;
}

function Request({
  today,
  name,
  email,
  mobile,
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

  const [activity, setActivity] = useState("");
  const [ministry, setMinistry] = useState("");
  const [ministryOther, setMinistryOther] = useState("");
  const [people, setPeople] = useState("");
  const [setup, setSetup] = useState<Setup>("classroom");
  const [date, setDate] = useState("");
  const [start, setStart] = useState<Minutes | null>(null);
  const [end, setEnd] = useState<Minutes | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Record<string, number>>({});
  const [food, setFood] = useState("none");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<{ date: string; times: Busy } | null>(null);

  // What's already held on the chosen date. Refetched after a failed send,
  // in case someone else took a room in the meantime.
  useEffect(() => {
    if (!date) return;
    let live = true;
    roomBusyTimes(date).then((times) => live && setBusy({ date, times }));
    return () => {
      live = false;
    };
  }, [date, state]);

  const open = useMemo(() => (date ? dayWindow(date) : null), [date]);
  const sunday = Boolean(date) && !open;
  const headcount = Number(people);
  const headcountOk = Number.isInteger(headcount) && headcount > 0;

  const starts = useMemo(() => {
    if (!open) return [];
    const out: Minutes[] = [];
    for (let m = open.from; m < open.to; m += STEP_MINUTES) out.push(m);
    return out;
  }, [open]);
  const ends = useMemo(() => {
    if (!open || start === null) return [];
    const out: Minutes[] = [];
    for (let m = start + STEP_MINUTES; m <= open.to; m += STEP_MINUTES) out.push(m);
    return out;
  }, [open, start]);

  const timed = Boolean(date && open && start !== null && end !== null);
  const loaded = busy?.date === date;

  /** Why each room can't be picked right now, or null when it can. */
  const blocked = (slug: string, cap: number | undefined): string | null => {
    if (!cap) return "Doesn't offer this set-up";
    if (!timed) return null;
    const why = closedReason(slug, date, start!, end!);
    if (why) return why;
    if (loaded && (busy!.times[slug] ?? []).some(([a, b]) => a < end! && b > start!)) return "Already requested for this time";
    return null;
  };

  // Drop rooms that stop fitting when the set-up, date or time changes.
  const picked = rooms.filter((slug) => {
    const r = MINISTRY_ROOMS.find((x) => x.slug === slug)!;
    return !blocked(slug, r.capacity[setup]);
  });
  const seats = picked.reduce((n, slug) => n + (MINISTRY_ROOMS.find((x) => x.slug === slug)!.capacity[setup] ?? 0), 0);

  const ministryName = ministry === "Other" ? ministryOther.trim() : ministry;
  const missing = [
    !activity.trim() && "event name",
    !ministryName && "ministry",
    !headcountOk && "headcount",
    !timed && "date and time",
    !picked.length && "a room",
    !agreed && "the policies",
  ].filter(Boolean) as string[];

  if (state?.ok) {
    return (
      <div role="status" className="border border-clay bg-paper-bright p-7 sm:p-9">
        <p className="label text-clay">Request sent</p>
        <h2 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl">We have your request.</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The facilities team will check it and email you at <span className="text-ink">{email}</span> when
          it&rsquo;s confirmed. The {picked.length > 1 ? "rooms are" : "room is"} held for you while they look,
          but please wait for the confirmation before announcing it.
          {state.emailed ? " We've emailed you a copy of this request." : ""}
        </p>
        <dl className="mt-7 max-w-xl divide-y divide-hairline border-y border-hairline text-[0.95rem]">
          <SummaryRow label="Reference" value={state.reference ?? "—"} />
          <SummaryRow label="Event" value={activity} />
          <SummaryRow label="When" value={timed ? `${dateLabel(date)}, ${timeLabel(start!)} to ${timeLabel(end!)}` : "—"} />
          <SummaryRow label={picked.length > 1 ? "Rooms" : "Room"} value={picked.map(roomName).join(", ")} />
          <SummaryRow label="People" value={String(headcount)} />
        </dl>
        <div className="mt-7 flex flex-wrap gap-5">
          <Link href="/my/reservations" className="label text-clay underline underline-offset-4">
            See my requests
          </Link>
          <button type="button" onClick={onAnother} className="label text-clay underline underline-offset-4 hover:text-clay-deep">
            Request another room
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-12">
        <Step n={1} title="Your event">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Event name" error={e.activity}>
                <input
                  name="activity"
                  value={activity}
                  onChange={(ev) => setActivity(ev.target.value)}
                  placeholder="e.g. Elevate core huddle"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Ministry" hint="The lead ministry, if several are involved." error={e.ministry}>
              <select name="ministry" value={ministry} onChange={(ev) => setMinistry(ev.target.value)} className={inputClass}>
                <option value="" disabled>
                  Choose one
                </option>
                {MINISTRIES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="How many people?" hint="Everyone: team, volunteers, speakers and guests." error={e.participants}>
              <input
                name="participants"
                type="number"
                inputMode="numeric"
                min={1}
                value={people}
                onChange={(ev) => setPeople(ev.target.value)}
                className={inputClass}
              />
            </Field>
            {ministry === "Other" ? (
              <div className="sm:col-span-2">
                <Field label="Ministry name">
                  <input
                    name="ministry_other"
                    value={ministryOther}
                    onChange={(ev) => setMinistryOther(ev.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <fieldset className="mt-6">
            <legend className="label text-clay">Set-up</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {SETUPS.map((s) => (
                <Choice key={s.id} name="setup" value={s.id} checked={setup === s.id} onChange={() => setSetup(s.id)}>
                  <span className="text-[1.02rem] font-semibold">{s.label}</span>
                  <span className="mt-0.5 text-[0.82rem] leading-snug text-ink-mute">{s.hint}</span>
                </Choice>
              ))}
            </div>
            {e.setup ? <Err>{e.setup}</Err> : null}
          </fieldset>
        </Step>

        <Step
          n={2}
          title="Date and time"
          hint="Include time to set up before and pack up after. Rooms can be requested Monday to Saturday."
          error={e.date ?? e.time}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <input
                name="date"
                type="date"
                min={today}
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Start">
              <select
                name="start"
                value={start === null ? "" : toHHMM(start)}
                disabled={!open}
                onChange={(ev) => {
                  const s = ev.target.value ? Number(ev.target.value.slice(0, 2)) * 60 + Number(ev.target.value.slice(3)) : null;
                  setStart(s);
                  if (s !== null && (end === null || end <= s)) setEnd(Math.min(s + 120, open!.to));
                }}
                className={inputClass}
              >
                <option value="">{open ? "Choose" : "Pick a date"}</option>
                {starts.map((m) => (
                  <option key={m} value={toHHMM(m)}>
                    {timeLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="End">
              <select
                name="end"
                value={end === null ? "" : toHHMM(end)}
                disabled={start === null}
                onChange={(ev) => setEnd(ev.target.value ? Number(ev.target.value.slice(0, 2)) * 60 + Number(ev.target.value.slice(3)) : null)}
                className={inputClass}
              >
                <option value="">{start === null ? "Pick a start" : "Choose"}</option>
                {ends.map((m) => (
                  <option key={m} value={toHHMM(m)}>
                    {timeLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {date && !sunday ? <p className="mt-2 text-[0.88rem] text-ink-mute">{dateLabel(date)}</p> : null}
          {sunday ? (
            <p className="mt-3 border-l-2 border-clay pl-3 text-[0.92rem] text-ink-soft">
              Sundays are for the services, so rooms can&rsquo;t be requested. Pick a day from Monday to Saturday.
            </p>
          ) : null}
        </Step>

        <Step
          n={3}
          title="Rooms"
          hint={
            timed
              ? "Rooms that are free and open for your time. Tick more than one if you need the space."
              : "Seats shown are for the set-up you chose. Pick a date and time to see what's free."
          }
          error={e.rooms}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {MINISTRY_ROOMS.map((r) => {
              const cap = r.capacity[setup];
              const why = blocked(r.slug, cap);
              const on = picked.includes(r.slug);
              return (
                <label
                  key={r.slug}
                  className={`flex items-start gap-3 border p-4 transition-colors ${
                    why
                      ? "cursor-not-allowed border-hairline bg-paper-deep/50 text-ink-mute"
                      : on
                        ? "cursor-pointer border-clay bg-clay/5"
                        : "cursor-pointer border-hairline bg-paper-bright hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="room"
                    value={r.slug}
                    checked={on}
                    disabled={Boolean(why)}
                    onChange={(ev) => setRooms(ev.target.checked ? [...picked, r.slug] : picked.filter((s) => s !== r.slug))}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--clay)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[1.02rem] font-semibold ${why ? "" : "text-ink"}`}>{r.name}</span>
                    <span className="mt-0.5 block text-[0.85rem]">
                      {why ?? (
                        <span className={on ? "text-clay" : "text-ink-mute"}>
                          Seats {cap}
                          {timed && loaded ? " · Free" : ""}
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {picked.length && headcountOk ? (
            <p className={`mt-3 text-[0.9rem] ${seats < headcount ? "text-sky" : "text-ink-soft"}`}>
              {seats < headcount
                ? `These seat ${seats}, fewer than your ${headcount}. Add a room or choose another set-up.`
                : `These seat ${seats} for your ${headcount}.`}
            </p>
          ) : null}
        </Step>

        <Step n={4} title="Equipment and food" hint="Equipment is optional. We'll tell you if something you need isn't available on your date." error={e.food}>
          <div className="grid gap-2 sm:grid-cols-2">
            {EQUIPMENT.filter((item) => item.max > 1).map((item) => {
              const n = equipment[item.id] ?? 0;
              const set = (v: number) => setEquipment({ ...equipment, [item.id]: v });
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-4 border px-4 py-2 ${n ? "border-clay bg-clay/5" : "border-hairline bg-paper-bright"}`}
                >
                  <span className={n ? "font-semibold text-clay" : "text-ink"}>{item.label}s</span>
                  <div className="inline-flex items-stretch border border-hairline bg-paper-bright">
                    <button
                      type="button"
                      onClick={() => set(Math.max(0, n - 1))}
                      disabled={!n}
                      aria-label={`One fewer ${item.label.toLowerCase()}`}
                      className="w-9 text-xl text-ink transition-colors hover:bg-paper-deep disabled:text-ink-mute/40"
                    >
                      &minus;
                    </button>
                    <output aria-live="polite" className="flex w-9 items-center justify-center border-x border-hairline font-semibold tabular-nums">
                      {n}
                    </output>
                    <button
                      type="button"
                      onClick={() => set(Math.min(item.max, n + 1))}
                      disabled={n >= item.max}
                      aria-label={`One more ${item.label.toLowerCase()}`}
                      className="w-9 text-xl text-ink transition-colors hover:bg-paper-deep disabled:text-ink-mute/40"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {EQUIPMENT.filter((item) => item.max === 1).map((item) => {
              const on = Boolean(equipment[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEquipment({ ...equipment, [item.id]: on ? 0 : 1 })}
                  className={`border px-4 py-2 text-[0.95rem] transition-colors ${
                    on ? "border-clay bg-clay/5 font-semibold text-clay" : "border-hairline bg-paper-bright text-ink hover:border-ink"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {item.label}
                </button>
              );
            })}
          </div>
          {EQUIPMENT.map((item) => (
            <input key={item.id} type="hidden" name={`eq_${item.id}`} value={equipment[item.id] ?? 0} />
          ))}

          <fieldset className="mt-6">
            <legend className="label text-clay">Food</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {FOOD.map((f) => (
                <Choice key={f.id} name="food" value={f.id} checked={food === f.id} onChange={() => setFood(f.id)}>
                  <span className="text-[1.02rem] font-semibold">{f.label}</span>
                  {f.hint ? <span className="mt-0.5 text-[0.82rem] leading-snug text-ink-mute">{f.hint}</span> : null}
                </Choice>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <Field label="Anything else?" hint="Optional. Special set-up, a repeating schedule, or anything the team should know.">
              <textarea name="notes" rows={3} className={inputClass} />
            </Field>
          </div>
        </Step>

        <Step n={5} title="Your details" hint={`The confirmation goes to ${email}.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.name}>
              <input name="name" required autoComplete="name" defaultValue={name} className={inputClass} />
            </Field>
            <Field label="Mobile number" hint="For same-day changes." error={e.mobile}>
              <input
                name="mobile"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                defaultValue={mobile}
                placeholder="0917 123 4567"
                className={inputClass}
              />
            </Field>
          </div>
        </Step>

        <Step n={6} title="Room policies" error={e.accept}>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {ROOM_POLICIES.map(([t, b]) => (
              <li key={t} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <span className="font-semibold text-ink">{t}</span>
                <span className="text-[0.92rem] leading-relaxed text-ink-soft">{b}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-3 border border-hairline bg-paper-bright p-4 text-[0.95rem] text-ink has-[:checked]:border-clay">
            <input
              type="checkbox"
              name="accept"
              checked={agreed}
              onChange={(ev) => setAgreed(ev.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--clay)]"
            />
            <span>I accept these policies on behalf of my ministry.</span>
          </label>
        </Step>
      </div>

      <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
        <p className="label text-clay">Your request</p>
        <dl className="mt-4 divide-y divide-hairline border-y border-hairline text-[0.95rem]">
          <SummaryRow label="Event" value={activity.trim() || "—"} muted={!activity.trim()} />
          <SummaryRow label="Ministry" value={ministryName || "—"} muted={!ministryName} />
          <SummaryRow label="Date" value={date && !sunday ? dateLabel(date) : "—"} muted={!date || sunday} />
          <SummaryRow label="Time" value={timed ? `${timeLabel(start!)} to ${timeLabel(end!)}` : "—"} muted={!timed} />
          <SummaryRow label={picked.length > 1 ? "Rooms" : "Room"} value={picked.length ? picked.map(roomName).join(", ") : "—"} muted={!picked.length} />
          <SummaryRow label="People" value={headcountOk ? String(headcount) : "—"} muted={!headcountOk} />
          <SummaryRow label="Equipment" value={equipmentSummary(equipment)} muted={equipmentSummary(equipment) === "None"} />
        </dl>

        {state?.formError ? (
          <p role="alert" className="mt-4 border-l-2 border-sky pl-3 text-[0.9rem] text-sky">
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
        {Object.keys(e).length ? (
          <p role="alert" className="mt-4 border-l-2 border-sky pl-3 text-[0.9rem] text-sky">
            Something needs fixing above.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sending || missing.length > 0}
          className="btn-press label mt-5 w-full border border-clay bg-clay px-6 py-4 text-paper-bright transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send request"}
        </button>
        <p className="mt-3 text-[0.82rem] leading-relaxed text-ink-mute">
          {missing.length
            ? `Still needed: ${missing.join(", ")}.`
            : "Rooms are free for ministries. The facilities team confirms each request by email."}
        </p>
      </aside>
    </form>
  );
}

const roomName = (slug: string) => MINISTRY_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

function Choice({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col border px-4 py-3 transition-colors ${
        checked ? "border-clay bg-clay/5 text-clay" : "border-hairline bg-paper-bright text-ink hover:border-ink"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
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
