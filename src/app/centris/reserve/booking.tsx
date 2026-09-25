"use client";

import { useActionState, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import type { Facility } from "@/lib/types";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { Button, cx } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import {
  createReservation,
  type ReservationResult,
} from "@/app/actions/reservations";

/**
 * Room request for ministry gatherings.
 *
 * Rooms only: the page hands in facilities without courts, so there is no
 * court grid here. Court booking will be its own flow once the Sports Hall
 * setup and rates are settled. The server action still accepts `court_id`;
 * this flow just never sends one.
 *
 * Every request lands as `pending` and a facilities admin approves it before
 * it goes on the calendar. Nothing is charged and no price or capacity is
 * shown, because rooms are free for ministries and room capacities aren't
 * confirmed yet.
 */

type Step = 1 | 2 | 3 | 4;

/** The action accepts up to 8 hours per request. */
const MAX_HOURS = 8;

export function BookingFlow({
  facilities,
  initialFacility,
  initialDate,
  today,
}: {
  facilities: Facility[];
  initialFacility: string | null;
  initialDate: string | null;
  today: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [facilitySlug, setFacilitySlug] = useState<string | null>(
    facilities.some((f) => f.slug === initialFacility) ? initialFacility : null,
  );
  const [chosenDate, setChosenDate] = useState(initialDate ?? "");
  const [startTime, setStartTime] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [participants, setParticipants] = useState("");
  const [layout, setLayout] = useState("");
  const [accepted, setAccepted] = useState(false);
  // Captured once so start times already past today can be greyed out.
  const [loadedAt] = useState(() => Date.now());
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    org: "",
    activity: "",
    purpose: "",
  });

  const [result, submit, pending] = useActionState<
    ReservationResult | null,
    FormData
  >(createReservation, null);
  const errors = result?.fieldErrors ?? {};

  const facility = useMemo(
    () => facilities.find((f) => f.slug === facilitySlug) ?? null,
    [facilitySlug, facilities],
  );

  const times = useMemo(() => startTimes(facility), [facility]);
  const startIso =
    chosenDate && startTime ? `${chosenDate}T${startTime}:00+08:00` : null;

  /** Hours left before the room closes, capped at what the action accepts. */
  const maxHours = useMemo(() => {
    if (!facility || !startTime) return 1;
    const close = Number(facility.close_time.slice(0, 2));
    const start = Number(startTime.slice(0, 2));
    return Math.max(1, Math.min(MAX_HOURS, close - start));
  }, [facility, startTime]);

  const headcount = Number(participants);
  const headcountOk = Number.isInteger(headcount) && headcount >= 1;

  const canContinue1 = Boolean(facility);
  const canContinue2 = Boolean(chosenDate && startTime);
  const canContinue3 = Boolean(form.activity.trim()) && headcountOk;

  // Problems the server found with earlier steps, shown on the last step.
  const earlierErrors = [
    errors.facility_slug,
    errors.date,
    errors.start_time,
    errors.hours,
    errors.participants,
  ].filter(Boolean);

  if (result?.ok) {
    return (
      <Confirmation
        reference={result.reference ?? "—"}
        facility={facility}
        startIso={startIso}
        hours={hours}
        participants={headcount}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_21rem] lg:items-start">
      <div>
        <Steps step={step} />

        {/* 1. Room */}
        {step === 1 ? (
          <Panel
            title="Which room?"
            body="Pick the room that fits your group best. If you're not sure, choose the closest one and tell us in your request."
          >
            <fieldset className="mt-6">
              <legend className="sr-only">Choose a room</legend>
              <div className="space-y-px border border-hairline bg-hairline">
                {facilities.map((f) => (
                  <label
                    key={f.slug}
                    className={cx(
                      "flex cursor-pointer items-start gap-4 bg-paper-bright p-5 transition-colors",
                      facilitySlug === f.slug ? "bg-bone" : "hover:bg-bone/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="facility"
                      checked={facilitySlug === f.slug}
                      onChange={() => {
                        setFacilitySlug(f.slug);
                        setStartTime(null);
                        setHours(1);
                        setLayout("");
                      }}
                      className="mt-1 h-4 w-4 accent-clay"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block text-xl leading-tight">
                        {f.name}
                      </span>
                      {f.description ? (
                        <span className="mt-1 block text-[0.88rem] leading-relaxed text-ink-soft">
                          {f.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-4 text-[0.85rem] text-ink-mute">
              Meeting as a Dgroup?{" "}
              <Link
                href="/reserve/dgroup"
                className="text-clay underline underline-offset-4"
              >
                Book a Dgroup table
              </Link>{" "}
              instead.
            </p>

            <Nav onNext={() => setStep(2)} nextDisabled={!canContinue1} />
          </Panel>
        ) : null}

        {/* 2. When */}
        {step === 2 ? (
          <Panel
            title="When?"
            body="Choose a date, a start time and how long you need the room. Include your setup and pack-down time."
          >
            <div className="mt-6 max-w-xs">
              <Field label="Date" name="date" required>
                {(p) => (
                  <input
                    {...p}
                    type="date"
                    min={today}
                    value={chosenDate}
                    onChange={(e) => {
                      setChosenDate(e.target.value);
                      setStartTime(null);
                      setHours(1);
                    }}
                    className={controlClass}
                  />
                )}
              </Field>
              {chosenDate ? (
                <p className="mt-2 text-[0.85rem] text-ink-mute">
                  {fmtDayLong(`${chosenDate}T12:00:00+08:00`)}
                </p>
              ) : null}
            </div>

            {chosenDate ? (
              <fieldset className="mt-7">
                <legend className="label text-ink-mute">Start time</legend>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {times.map((t) => {
                    const iso = `${chosenDate}T${t}:00+08:00`;
                    const past =
                      chosenDate === today &&
                      new Date(iso).getTime() < loadedAt;
                    const on = startTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={past}
                        aria-pressed={on}
                        onClick={() => {
                          setStartTime(t);
                          setHours(1);
                        }}
                        className={cx(
                          "btn-press border px-2 py-2.5 text-[0.82rem] font-semibold transition-colors",
                          past &&
                            "cursor-not-allowed border-transparent bg-ink/5 text-ink-mute/50 line-through",
                          !past && on && "border-clay bg-clay text-paper-bright",
                          !past &&
                            !on &&
                            "border-ink/25 text-ink hover:border-ink",
                        )}
                      >
                        {fmtTime(iso)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.8rem] text-ink-mute">
                  The facilities team checks the calendar and confirms the time
                  with you.
                </p>
              </fieldset>
            ) : null}

            {startTime ? (
              <fieldset className="mt-7">
                <legend className="label text-ink-mute">How long?</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: maxHours }, (_, i) => i + 1).map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={hours === h}
                      onClick={() => setHours(h)}
                      className={cx(
                        "btn-press label border px-3.5 py-2 transition-colors",
                        hours === h
                          ? "border-clay bg-clay text-paper-bright"
                          : "border-ink/25 text-ink hover:border-ink",
                      )}
                    >
                      {h} {h === 1 ? "hour" : "hours"}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <Nav
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!canContinue2}
            />
          </Panel>
        ) : null}

        {/* 3. Details */}
        {step === 3 ? (
          <Panel
            title="Details"
            body="Tell us what the room is for so the team can set it up properly."
          >
            <div className="mt-6 space-y-5">
              <Field label="Activity or event name" name="activity" required>
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    value={form.activity}
                    onChange={(e) =>
                      setForm({ ...form, activity: e.target.value })
                    }
                    className={controlClass}
                  />
                )}
              </Field>
              <Field label="Ministry or group" name="org" hint="Optional">
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    value={form.org}
                    onChange={(e) => setForm({ ...form, org: e.target.value })}
                    className={controlClass}
                  />
                )}
              </Field>
              <div className="max-w-xs">
                <Field
                  label="How many people?"
                  name="participants"
                  required
                  hint="Your best guess is fine"
                >
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                      className={controlClass}
                    />
                  )}
                </Field>
              </div>
              <Field
                label="Anything else we should know?"
                name="purpose"
                hint="Optional"
              >
                {(p) => (
                  <textarea
                    {...p}
                    rows={3}
                    value={form.purpose}
                    onChange={(e) =>
                      setForm({ ...form, purpose: e.target.value })
                    }
                    className={controlClass}
                    placeholder="A GLC class, a team training, a Dgroup leaders' meeting. Mention any chairs, tables or AV you'll need, or if this repeats weekly or monthly."
                  />
                )}
              </Field>

              {facility?.layouts.length ? (
                <fieldset>
                  <legend className="label text-ink-mute">
                    Seating layout{" "}
                    <span className="normal-case tracking-normal">(optional)</span>
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {facility.layouts.map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={layout === l}
                        onClick={() => setLayout(layout === l ? "" : l)}
                        className={cx(
                          "btn-press label border px-3.5 py-2 transition-colors",
                          layout === l
                            ? "border-clay bg-clay text-paper-bright"
                            : "border-ink/25 text-ink hover:border-ink",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>

            <Nav
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextDisabled={!canContinue3}
            />
          </Panel>
        ) : null}

        {/* 4. Send */}
        {step === 4 ? (
          <Panel
            title="Nearly there"
            body="We need a name and an email so the facilities team can reach you about this request."
          >
            <form
              className="mt-6 space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("facility_slug", facilitySlug ?? "");
                fd.set("date", chosenDate);
                fd.set("start_time", startTime ?? "");
                fd.set("hours", String(hours));
                fd.set("participants", String(headcount));
                if (layout) fd.set("layout", layout);
                fd.set("activity", form.activity);
                fd.set("org", form.org);
                fd.set("purpose", form.purpose);
                fd.set("name", form.name);
                fd.set("email", form.email);
                fd.set("mobile", form.mobile);
                fd.set("accept", accepted ? "true" : "");
                startTransition(() => submit(fd));
              }}
            >
              {result?.formError || earlierErrors.length ? (
                <div className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
                  {result?.formError ? <p>{result.formError}</p> : null}
                  {earlierErrors.map((m) => (
                    <p key={m}>{m} Go back to fix it.</p>
                  ))}
                </div>
              ) : null}

              <Field label="Your name" name="name" required error={errors.name}>
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={controlClass}
                  />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" name="email" required error={errors.email}>
                  {(p) => (
                    <input
                      {...p}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className={controlClass}
                    />
                  )}
                </Field>
                <Field label="Mobile" name="mobile" hint="For same-day changes">
                  {(p) => (
                    <input
                      {...p}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({ ...form, mobile: e.target.value })
                      }
                      className={controlClass}
                    />
                  )}
                </Field>
              </div>

              <div className="border border-hairline bg-paper-bright p-5">
                <p className="label text-ink-mute">Before you send</p>
                <ul className="mt-3 space-y-2 text-[0.88rem] leading-relaxed text-ink-soft">
                  {[
                    "Include setup and pack-down in the time you asked for.",
                    "Leave the room as you found it.",
                    "If plans change, tell us as early as you can.",
                  ].map((r) => (
                    <li key={r} className="flex gap-3">
                      <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                      {r}
                    </li>
                  ))}
                </ul>

                <label className="mt-5 flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="accept"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    aria-invalid={errors.accept ? true : undefined}
                    aria-describedby={errors.accept ? "accept-err" : undefined}
                    className="mt-1 h-4 w-4 accent-clay"
                  />
                  <span className="text-[0.9rem] text-ink-soft">
                    I&rsquo;ve read the{" "}
                    <Link
                      href="/centris/reserve#policies"
                      className="text-clay underline underline-offset-4"
                    >
                      room policies
                    </Link>{" "}
                    and will pass them on to my group.
                  </span>
                </label>
                {errors.accept ? (
                  <p
                    id="accept-err"
                    className="mt-1.5 flex items-center gap-1.5 text-[0.8rem] font-semibold text-clay-deep"
                  >
                    <span aria-hidden>!</span>
                    {errors.accept}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <Button type="button" tone="ghost" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button type="submit" size="lg" disabled={pending}>
                  {pending ? "Sending…" : "Send request"}
                </Button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>

      {/* Running summary */}
      <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
        <p className="label text-clay">Your request</p>
        <dl className="mt-5 space-y-4 text-[0.9rem]">
          <Row label="Room" value={facility?.name ?? "Not chosen"} />
          <Row
            label="When"
            value={
              startIso
                ? `${fmtDayLong(startIso)}, ${fmtTime(startIso)}`
                : chosenDate
                  ? fmtDayLong(`${chosenDate}T12:00:00+08:00`)
                  : "Not chosen"
            }
          />
          <Row
            label="Length"
            value={`${hours} ${hours === 1 ? "hour" : "hours"}`}
          />
          {headcountOk ? (
            <Row label="People" value={String(headcount)} />
          ) : null}
          {layout ? <Row label="Layout" value={layout} /> : null}
        </dl>

        <p className="mt-6 border-t border-hairline pt-5 text-[0.8rem] leading-relaxed text-ink-mute">
          Rooms are free for ministries. The facilities team confirms each
          request before it goes on the calendar.
        </p>
        <Link
          href="/centris/reserve#policies"
          className="label mt-3 inline-block text-clay underline underline-offset-4"
        >
          Room policies
        </Link>
      </aside>
    </div>
  );
}

/* --- Confirmation ---------------------------------------------------------- */

function Confirmation({
  reference,
  facility,
  startIso,
  hours,
  participants,
}: {
  reference: string;
  facility: Facility | null;
  startIso: string | null;
  hours: number;
  participants: number;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <FormSuccess className="p-8">
        <p className="label text-clay">Request sent</p>
        <h2 className="display-md mt-3">Thanks. We got your request.</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          The facilities team will check the calendar and email you once your
          room is confirmed. The room isn&rsquo;t held until then, so please
          wait for that email before announcing it to your group.
        </p>

        <div className="mt-7 border border-dashed border-ink/25 bg-paper-bright p-6 text-center">
          <p className="label text-ink-mute">Reference</p>
          <p className="font-display mt-1 text-3xl tracking-wider tabular">
            {reference}
          </p>
          <p className="mt-2 text-[0.8rem] text-ink-mute">
            Mention this if you need to ask about your request.
          </p>
        </div>

        <dl className="mt-7 divide-y divide-hairline border-y border-hairline">
          {[
            ["Room", facility?.name ?? "—"],
            [
              "When",
              startIso ? `${fmtDayLong(startIso)}, ${fmtTime(startIso)}` : "—",
            ],
            ["Length", `${hours} ${hours === 1 ? "hour" : "hours"}`],
            ["People", String(participants)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="label text-ink-mute">{k}</dt>
              <dd className="text-right text-[0.95rem]">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-[0.85rem] leading-relaxed text-ink-mute">
          There is no charge. Rooms are free for ministries.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/my/reservations"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            See my requests
          </Link>
          <Link
            href="/reserve"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Back to Reserve
          </Link>
        </div>
      </FormSuccess>
    </div>
  );
}

/* --- Bits ------------------------------------------------------------------ */

function Steps({ step }: { step: Step }) {
  const labels = ["Room", "When", "Details", "Send"];
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-hairline pb-5">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cx(
                "label flex h-6 w-6 items-center justify-center border",
                state === "current" && "border-clay bg-clay text-paper-bright",
                state === "done" && "border-ink bg-ink text-paper-bright",
                state === "todo" && "border-hairline text-ink-mute",
              )}
            >
              {n}
            </span>
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cx("label", state === "todo" ? "text-ink-mute" : "text-ink")}
            >
              {l}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Panel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rise pt-10">
      <h2 className="display-md">{title}</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">{body}</p>
      {children}
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex justify-between gap-3">
      {onBack ? (
        <Button tone="ghost" onClick={onBack}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled}>
        Continue
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-mute">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Hourly start times ("HH:MM", Manila) within the room's listed hours. Rooms
 * have no live grid; the facilities team checks the calendar on approval.
 */
function startTimes(f: Facility | null): string[] {
  if (!f) return [];
  const open = Number(f.open_time.slice(0, 2));
  const close = Number(f.close_time.slice(0, 2));
  return Array.from({ length: Math.max(0, close - open) }, (_, i) =>
    `${String(open + i).padStart(2, "0")}:00`,
  );
}
