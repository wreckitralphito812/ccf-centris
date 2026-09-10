"use client";

import { useActionState, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import type { Facility, Slot } from "@/lib/types";
import { fmtDayLong, fmtPeso, fmtTime } from "@/lib/format";
import { Button, Pill, cx } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import {
  createReservation,
  type ReservationResult,
} from "@/app/actions/reservations";

/**
 * Court and room booking.
 *
 * Two shapes behind one flow: a court is booked by the hour from a live
 * availability grid, a room is a request with setup, layout, and equipment
 * that a facilities admin approves. The step list adapts rather than showing
 * irrelevant questions.
 *
 * Nothing is charged and no total is shown. Rooms are free for ministries, and
 * court rates aren't set yet, so any price here would be invented. A court
 * booking ends "reserved" and a room ends "pending approval".
 */

type Step = 1 | 2 | 3 | 4;

export function BookingFlow({
  facilities,
  slotsByCourt,
  initialFacility,
  initialCourt,
  date,
  dateOptions,
}: {
  facilities: Facility[];
  slotsByCourt: Record<string, Slot[]>;
  initialFacility: string | null;
  initialCourt: string | null;
  date: string;
  dateOptions: string[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [facilitySlug, setFacilitySlug] = useState<string | null>(initialFacility);
  const [courtId, setCourtId] = useState<string | null>(initialCourt);
  const [chosenDate, setChosenDate] = useState(date);
  const [startIso, setStartIso] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [participants, setParticipants] = useState(4);
  const [layout, setLayout] = useState("");
  const [accepted, setAccepted] = useState(false);
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

  const isCourt = Boolean(facility?.courts.length);
  const slots = courtId ? (slotsByCourt[courtId] ?? []) : [];

  /** Consecutive availability from the chosen start, capped at 4 hours. */
  const maxHours = useMemo(() => {
    if (!startIso) return 1;
    const i = slots.findIndex((s) => s.start === startIso);
    if (i < 0) return 1;
    let n = 0;
    while (n < 4 && slots[i + n]?.state === "available") n++;
    return Math.max(1, n);
  }, [startIso, slots]);

  const canContinue1 = Boolean(facility);
  const canContinue2 = isCourt ? Boolean(courtId && startIso) : Boolean(chosenDate && startIso);

  // 24h HH:MM in Manila, for the hidden start_time field the action parses.
  const start24 = startIso
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
      }).format(new Date(startIso))
    : "";

  if (result?.ok) {
    return (
      <Confirmation
        reference={result.reference ?? "—"}
        facility={facility}
        courtId={courtId}
        startIso={startIso}
        hours={hours}
        isCourt={isCourt}
        participants={participants}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_21rem] lg:items-start">
      <div>
        <Steps step={step} isCourt={isCourt} />

        {/* 1. Space */}
        {step === 1 ? (
          <Panel
            title="What do you need?"
            body="Courts are booked by the hour. Rooms are a request, and the facilities team confirms them."
          >
            <fieldset className="mt-6">
              <legend className="sr-only">Choose a space</legend>
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
                        setCourtId(null);
                        setStartIso(null);
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
                      <span className="mt-2 flex flex-wrap gap-2">
                        {f.capacity ? (
                          <Pill tone="muted">Up to {f.capacity}</Pill>
                        ) : null}
                        {f.hourly_rate_cents === 0 ? (
                          <Pill tone="moss">No charge</Pill>
                        ) : f.hourly_rate_cents === null ? (
                          <Pill tone="muted">Rates to be posted</Pill>
                        ) : (
                          <Pill tone="muted">
                            {fmtPeso(f.hourly_rate_cents)}/hr
                          </Pill>
                        )}
                        {f.requires_approval ? (
                          <Pill tone="clay">Needs approval</Pill>
                        ) : null}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Nav onNext={() => setStep(2)} nextDisabled={!canContinue1} />
          </Panel>
        ) : null}

        {/* 2. When */}
        {step === 2 ? (
          <Panel
            title="When?"
            body={
              isCourt
                ? "Pick a court, then an hour. Grey slots are already taken."
                : "Choose a date and a start time. Include your setup and packing-down time."
            }
          >
            {isCourt && facility ? (
              <fieldset className="mt-6">
                <legend className="label text-ink-mute">Court</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {facility.courts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={courtId === c.id}
                      onClick={() => {
                        setCourtId(c.id);
                        setStartIso(null);
                      }}
                      className={cx(
                        "btn-press label border px-3.5 py-2 transition-colors",
                        courtId === c.id
                          ? "border-clay bg-clay text-paper-bright"
                          : "border-ink/25 text-ink hover:border-ink",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="mt-7">
              <legend className="label text-ink-mute">Date</legend>
              <div className="no-bar mt-3 flex gap-2 overflow-x-auto pb-1">
                {dateOptions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={chosenDate === d}
                    onClick={() => {
                      setChosenDate(d);
                      setStartIso(null);
                    }}
                    className={cx(
                      "btn-press label shrink-0 border px-3.5 py-2 transition-colors",
                      chosenDate === d
                        ? "border-clay bg-clay text-paper-bright"
                        : "border-ink/25 text-ink hover:border-ink",
                    )}
                  >
                    {fmtDayLong(`${d}T12:00:00+08:00`).split(",")[0].slice(0, 3)}
                    <span className="ml-1.5 opacity-60">{d.slice(8)}</span>
                  </button>
                ))}
              </div>
              {chosenDate !== date ? (
                <p className="mt-2 text-[0.8rem] text-ink-mute">
                  Showing availability for {fmtDayLong(`${date}T12:00:00+08:00`)}.
                  Other dates are confirmed by the facilities team.
                </p>
              ) : null}
            </fieldset>

            {(isCourt && courtId) || !isCourt ? (
              <fieldset className="mt-7">
                <legend className="label text-ink-mute">Start time</legend>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {(isCourt ? slots : genericSlots(facility)).map((s) => {
                    const taken = s.state !== "available";
                    const on = startIso === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        disabled={taken}
                        aria-pressed={on}
                        onClick={() => {
                          setStartIso(s.start);
                          setHours(1);
                        }}
                        className={cx(
                          "btn-press border px-2 py-2.5 text-[0.82rem] font-semibold transition-colors",
                          taken &&
                            "cursor-not-allowed border-transparent bg-ink/5 text-ink-mute/50 line-through",
                          !taken &&
                            on &&
                            "border-clay bg-clay text-paper-bright",
                          !taken &&
                            !on &&
                            "border-ink/25 text-ink hover:border-ink",
                        )}
                      >
                        {fmtTime(s.start)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {startIso ? (
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
                {maxHours < 4 ? (
                  <p className="mt-2 text-[0.8rem] text-ink-mute">
                    The next slot is taken, so this booking can run up to{" "}
                    {maxHours} {maxHours === 1 ? "hour" : "hours"}.
                  </p>
                ) : null}
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
            body={
              isCourt
                ? "Who's playing, and anything you need from the equipment desk."
                : "Tell us what the room is for so the team can set it up properly."
            }
          >
            {!isCourt ? (
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
                <Field
                  label="Organisation or ministry"
                  name="org"
                  hint="Optional"
                >
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
                <Field label="What's it for?" name="purpose">
                  {(p) => (
                    <textarea
                      {...p}
                      rows={3}
                      value={form.purpose}
                      onChange={(e) =>
                        setForm({ ...form, purpose: e.target.value })
                      }
                      className={controlClass}
                      placeholder="A GLC class, a team training, a Dgroup leaders' meeting. Mention any chairs, tables, or AV you'll need."
                    />
                  )}
                </Field>

                {facility?.layouts.length ? (
                  <fieldset>
                    <legend className="label text-ink-mute">Seating layout</legend>
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
            ) : null}

            <div className="mt-6 flex items-center justify-between border border-hairline px-4 py-3">
              <span className="label text-ink-mute">
                {isCourt ? "Players" : "Expected participants"}
              </span>
              <span className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label="Fewer"
                  onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                  className="btn-press flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
                >
                  −
                </button>
                <span className="font-display w-8 text-center text-xl tabular-nums">
                  {participants}
                </span>
                <button
                  type="button"
                  aria-label="More"
                  onClick={() =>
                    setParticipants((p) =>
                      Math.min(facility?.capacity ?? 200, p + 1),
                    )
                  }
                  className="btn-press flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
                >
                  +
                </button>
              </span>
            </div>

            <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </Panel>
        ) : null}

        {/* 4. Confirm */}
        {step === 4 ? (
          <Panel
            title="Nearly there"
            body="We need a name and an email so the facilities team can reach you."
          >
            <form
              className="mt-6 space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("facility_slug", facilitySlug ?? "");
                if (isCourt && courtId) fd.set("court_id", courtId);
                fd.set("date", chosenDate);
                fd.set("start_time", start24);
                fd.set("hours", String(hours));
                fd.set("participants", String(participants));
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
              {result?.formError ? (
                <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
                  {result.formError}
                </p>
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
                <p className="label text-ink-mute">Before you confirm</p>
                <ul className="mt-3 space-y-2 text-[0.88rem] leading-relaxed text-ink-soft">
                  {(facility?.rules
                    ? [facility.rules]
                    : ["Please leave the space as you found it."]
                  ).map((r) => (
                    <li key={r} className="flex gap-3">
                      <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                      {r}
                    </li>
                  ))}
                  <li className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-clay" />
                    Cancel at least 24 hours ahead, or the slot is held against
                    your booking history.
                  </li>
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
                    I have read the rules and accept them on behalf of everyone
                    in my group.
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
                  {pending
                    ? "Sending…"
                    : facility?.requires_approval
                      ? "Send request"
                      : "Confirm booking"}
                </Button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>

      {/* Running summary */}
      <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
        <p className="label text-clay">Your booking</p>
        <dl className="mt-5 space-y-4 text-[0.9rem]">
          <Row label="Space" value={facility?.name ?? "Not chosen"} />
          {isCourt ? (
            <Row
              label="Court"
              value={
                facility?.courts.find((c) => c.id === courtId)?.name ??
                "Not chosen"
              }
            />
          ) : null}
          <Row
            label="When"
            value={
              startIso
                ? `${fmtDayLong(startIso)}, ${fmtTime(startIso)}`
                : "Not chosen"
            }
          />
          <Row
            label="Length"
            value={`${hours} ${hours === 1 ? "hour" : "hours"}`}
          />
          <Row
            label={isCourt ? "Players" : "Participants"}
            value={String(participants)}
          />
          {layout ? <Row label="Layout" value={layout} /> : null}
        </dl>

        <p className="mt-6 border-t border-hairline pt-5 text-[0.8rem] leading-relaxed text-ink-mute">
          {isCourt
            ? "Court rates will be posted soon. Nothing is charged online."
            : "Rooms are free for ministries. Nothing is charged online."}{" "}
          Keep your reference.
        </p>
        <Link
          href="/centris/reserve#policies"
          className="label mt-3 inline-block text-clay underline underline-offset-4"
        >
          Booking policies
        </Link>
      </aside>
    </div>
  );
}

/* --- Confirmation ---------------------------------------------------------- */

function Confirmation({
  reference,
  facility,
  courtId,
  startIso,
  hours,
  isCourt,
  participants,
}: {
  reference: string;
  facility: Facility | null;
  courtId: string | null;
  startIso: string | null;
  hours: number;
  isCourt: boolean;
  participants: number;
}) {
  const pending = facility?.requires_approval ?? false;
  const ref = reference;

  return (
    <div className="mx-auto max-w-2xl">
      <FormSuccess className="p-8">
        <p className="label text-clay">
          {pending ? "Request sent" : "Booking confirmed"}
        </p>
        <h2 className="display-md mt-3">
          {pending ? "We'll confirm within a day." : "You're booked."}
        </h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          {pending
            ? "The facilities team reviews room requests and will email you once it is confirmed. Nothing is held until then."
            : "Your court is held. Come to the Sports Hall desk a few minutes early and give your reference."}
        </p>

        <div className="mt-7 border border-dashed border-ink/25 bg-paper-bright p-6 text-center">
          <p className="label text-ink-mute">Reference</p>
          <p className="font-display mt-1 text-3xl tracking-wider tabular">
            {ref}
          </p>
        </div>

        <dl className="mt-7 divide-y divide-hairline border-y border-hairline">
          {[
            ["Space", facility?.name ?? "—"],
            ...(isCourt
              ? [[
                  "Court",
                  facility?.courts.find((c) => c.id === courtId)?.name ?? "—",
                ] as [string, string]]
              : []),
            [
              "When",
              startIso
                ? `${fmtDayLong(startIso)}, ${fmtTime(startIso)}`
                : "—",
            ],
            ["Length", `${hours} ${hours === 1 ? "hour" : "hours"}`],
            [isCourt ? "Players" : "Participants", String(participants)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="label text-ink-mute">{k}</dt>
              <dd className="text-right text-[0.95rem]">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-[0.85rem] leading-relaxed text-ink-mute">
          {isCourt
            ? "Court rates will be posted soon. Nothing was charged online."
            : "There is no charge. Rooms are free for ministries."}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/centris/availability"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Book another
          </Link>
          <Link
            href="/centris/sports"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Sports at Centris
          </Link>
        </div>
      </FormSuccess>
    </div>
  );
}

/* --- Bits ------------------------------------------------------------------ */

function Steps({ step, isCourt }: { step: Step; isCourt: boolean }) {
  const labels = ["Space", "When", isCourt ? "Players" : "Details", "Confirm"];
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

/** Rooms have no live grid, so offer the facility's opening hours. */
function genericSlots(f: Facility | null): Slot[] {
  if (!f) return [];
  const open = Number(f.open_time.slice(0, 2));
  const close = Number(f.close_time.slice(0, 2));
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: Math.max(0, close - open) }, (_, i) => {
    const d = new Date(base);
    d.setHours(open + i);
    return {
      start: d.toISOString(),
      end: new Date(d.getTime() + 3600_000).toISOString(),
      state: "available" as const,
    };
  });
}
