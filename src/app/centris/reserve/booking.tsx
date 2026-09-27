"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Facility, Slot } from "@/lib/types";
import { fmtDayLong, fmtPeso, fmtTime } from "@/lib/format";
import { Button, cx } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import { AcceptRules, Chip, ChoiceGroup, ContactFields, Stepper } from "@/components/booking";
import type { MyContact } from "@/lib/queries";
import {
  createReservation,
  type ReservationResult,
} from "@/app/actions/reservations";

/**
 * Court and room booking, in three steps: the space, the time, then the
 * details. A court is booked by the hour from a live grid; a room is a request
 * the facilities team approves, so only rooms ask what the space is for.
 *
 * Every step stays mounted (just hidden) inside one form, so going Back never
 * loses what was typed. Changing the date reloads the page's data for that day,
 * so the court grid is always the real one.
 *
 * Nothing is charged and no total is shown. Rooms are free for ministries, and
 * court rates aren't set yet, so any price here would be invented.
 */

type Step = 1 | 2 | 3;

const STEPS = ["Space", "Time", "Details"] as const;

export function BookingFlow({
  facilities,
  slotsByCourt,
  initialFacility,
  initialCourt,
  date,
  dateOptions,
  contact,
}: {
  facilities: Facility[];
  slotsByCourt: Record<string, Slot[]>;
  initialFacility: string | null;
  initialCourt: string | null;
  date: string;
  dateOptions: string[];
  contact: MyContact | null;
}) {
  const router = useRouter();
  const known = facilities.some((f) => f.slug === initialFacility);

  // A link from a facility or court page lands straight on the time step.
  const [step, setStep] = useState<Step>(known ? 2 : 1);
  const [facilitySlug, setFacilitySlug] = useState<string | null>(known ? initialFacility : null);
  const [courtId, setCourtId] = useState<string | null>(initialCourt);
  const [chosenDate, setChosenDate] = useState(date);
  const [startIso, setStartIso] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [participants, setParticipants] = useState(4);
  const [layout, setLayout] = useState("");
  const [activityError, setActivityError] = useState<string>();
  const [loadingDay, startLoadingDay] = useTransition();

  const [result, submit, pending] = useActionState<ReservationResult | null, FormData>(
    createReservation,
    null,
  );
  const errors = result?.fieldErrors ?? {};

  const facility = useMemo(
    () => facilities.find((f) => f.slug === facilitySlug) ?? null,
    [facilitySlug, facilities],
  );
  const isCourt = Boolean(facility?.courts.length);
  const court = facility?.courts.find((c) => c.id === courtId) ?? null;

  // A court's grid for the day on screen; until a new day's data arrives, show none.
  const dayLoaded = !isCourt || date === chosenDate;
  const slots = useMemo(
    () =>
      !dayLoaded
        ? []
        : isCourt
          ? courtId
            ? (slotsByCourt[courtId] ?? [])
            : []
          : genericSlots(facility, chosenDate),
    [dayLoaded, isCourt, courtId, slotsByCourt, facility, chosenDate],
  );

  /** Consecutive availability from the chosen start, capped at 4 hours. */
  const maxHours = useMemo(() => {
    if (!startIso) return 1;
    const i = slots.findIndex((s) => s.start === startIso);
    if (i < 0) return 1;
    let n = 0;
    while (n < 4 && slots[i + n]?.state === "available") n++;
    return Math.max(1, n);
  }, [startIso, slots]);

  const timeChosen = Boolean(startIso && (!isCourt || courtId));

  // Move focus to the new step's heading, so keyboard and screen-reader users
  // land where the content changed. Skipped on first render.
  const headings = useRef<Record<number, HTMLHeadingElement | null>>({});
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headings.current[step]?.focus();
  }, [step]);

  // 24h HH:MM in Manila, for the start_time field the action parses.
  const start24 = startIso
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
      }).format(new Date(startIso))
    : "";

  /** Fetch the real court grid for `d` (rooms have no live grid). */
  function loadDay(d: string, f: Facility | null, court: string | null) {
    if (!f?.courts.length || d === date) return;
    const q = new URLSearchParams({ date: d, facility: f.slug });
    if (court) q.set("court", court);
    startLoadingDay(() => router.replace(`/centris/reserve?${q}`, { scroll: false }));
  }

  function pickDate(d: string) {
    setChosenDate(d);
    setStartIso(null);
    setHours(1);
    loadDay(d, facility, courtId);
  }

  if (result?.ok) {
    return (
      <Confirmation
        reference={result.reference ?? "—"}
        facility={facility}
        courtName={court?.name ?? null}
        startIso={startIso}
        hours={hours}
        participants={participants}
      />
    );
  }

  // Server errors on fields from earlier steps have no input here to sit under.
  const earlier = [errors.facility_slug, errors.date, errors.start_time, errors.hours]
    .filter(Boolean)
    .join(" ");

  const recap = facility ? (
    <Recap
      items={[
        [facility.name, 1],
        ...(isCourt && court ? [[court.name, 2] as [string, Step]] : []),
        ...(startIso
          ? [
              [`${fmtDayLong(startIso)}, ${fmtTime(startIso)}`, 2] as [string, Step],
              [`${hours} ${hours === 1 ? "hour" : "hours"}`, 2] as [string, Step],
            ]
          : []),
      ]}
      onChange={setStep}
    />
  ) : null;

  return (
    <form
      noValidate
      className="mx-auto max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!isCourt && !String(fd.get("activity") ?? "").trim()) {
          setActivityError("Give the activity or event a name.");
          e.currentTarget.querySelector<HTMLElement>('[name="activity"]')?.focus();
          return;
        }
        setActivityError(undefined);
        fd.set("facility_slug", facilitySlug ?? "");
        if (isCourt && courtId) fd.set("court_id", courtId);
        fd.set("date", chosenDate);
        fd.set("start_time", start24);
        fd.set("hours", String(hours));
        if (layout) fd.set("layout", layout);
        startTransition(() => submit(fd));
      }}
    >
      <Steps step={step} onGo={setStep} canGo={(n) => n === 1 || (n === 2 && Boolean(facility)) || (n === 3 && timeChosen)} />

      {/* 1. Space */}
      <div hidden={step !== 1} className="pt-10">
        <PanelHead
          ref={(el) => {
            headings.current[1] = el;
          }}
          title="What would you like to book?"
        />
        <ul className="mt-6 space-y-px border border-hairline bg-hairline">
          {facilities.map((f) => {
            const on = facilitySlug === f.slug;
            return (
              <li key={f.slug}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (!on) {
                      const only = f.courts.length === 1 ? f.courts[0].id : null;
                      setFacilitySlug(f.slug);
                      setCourtId(only);
                      setStartIso(null);
                      setHours(1);
                      setLayout("");
                      loadDay(chosenDate, f, only);
                    }
                    setStep(2);
                  }}
                  className={cx(
                    "group flex w-full items-center justify-between gap-4 p-5 text-left transition-colors",
                    on ? "bg-bone" : "bg-paper-bright hover:bg-bone/50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="font-display block text-xl leading-tight">{f.name}</span>
                    <span className="mt-1 block text-[0.85rem] text-ink-mute">{facilityMeta(f)}</span>
                  </span>
                  <span aria-hidden className="label shrink-0 text-clay transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 2. Time */}
      <div hidden={step !== 2} className="space-y-8 pt-10">
        <PanelHead
          ref={(el) => {
            headings.current[2] = el;
          }}
          title="When?"
          body={
            isCourt
              ? "Pick a court, a day and a start time."
              : "Pick a day and a start time. Include setup and pack-down time in how long you book."
          }
        />
        {recap}

        {isCourt && facility && facility.courts.length > 1 ? (
          <ChoiceGroup legend="Court">
            {facility.courts.map((c) => (
              <Chip
                key={c.id}
                on={courtId === c.id}
                onClick={() => {
                  setCourtId(c.id);
                  setStartIso(null);
                }}
              >
                {c.name}
              </Chip>
            ))}
          </ChoiceGroup>
        ) : null}

        <fieldset>
          <legend className="label text-ink-mute">Day</legend>
          <div className="no-bar mt-3 flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map((d) => (
              <Chip key={d} on={chosenDate === d} onClick={() => pickDate(d)} className="shrink-0">
                {fmtDayLong(`${d}T12:00:00+08:00`).split(",")[0].slice(0, 3)}
                <span className="ml-1.5 opacity-70">{Number(d.slice(8))}</span>
              </Chip>
            ))}
          </div>
        </fieldset>

        {isCourt && !courtId ? null : (
          <fieldset>
            <legend className="label text-ink-mute">Start time</legend>
            {loadingDay || !dayLoaded ? (
              <p className="mt-3 text-[0.9rem] text-ink-mute" aria-live="polite">
                Loading times…
              </p>
            ) : slots.some((s) => s.state === "available") ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {slots.map((s) => (
                  <Chip
                    key={s.start}
                    on={startIso === s.start}
                    disabled={s.state !== "available"}
                    onClick={() => {
                      setStartIso(s.start);
                      setHours(1);
                    }}
                    className="px-2"
                  >
                    {fmtTime(s.start)}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="mt-3 border border-dashed border-hairline p-5 text-[0.9rem] text-ink-mute">
                Nothing open this day. Try another.
              </p>
            )}
            {isCourt && slots.length ? (
              <p className="mt-2 text-[0.82rem] text-ink-mute">Crossed-out times are taken.</p>
            ) : null}
          </fieldset>
        )}

        {startIso ? (
          <ChoiceGroup
            legend="How long?"
            note={
              maxHours < 4
                ? `The next hour is taken, so this can run up to ${maxHours} ${maxHours === 1 ? "hour" : "hours"}.`
                : undefined
            }
          >
            {Array.from({ length: maxHours }, (_, i) => i + 1).map((h) => (
              <Chip key={h} on={hours === h} onClick={() => setHours(h)}>
                {h} {h === 1 ? "hour" : "hours"}
              </Chip>
            ))}
          </ChoiceGroup>
        ) : null}

        <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!timeChosen} />
      </div>

      {/* 3. Details */}
      <div hidden={step !== 3} className="space-y-8 pt-10">
        <PanelHead
          ref={(el) => {
            headings.current[3] = el;
          }}
          title="Your details"
          body={
            facility?.requires_approval
              ? "The facilities team reviews requests and emails you within a day."
              : "Check the details, then confirm."
          }
        />
        {recap}

        {!isCourt ? (
          <div className="space-y-5">
            <Field label="Activity or event name" name="activity" required error={activityError}>
              {(p) => <input {...p} type="text" className={controlClass} />}
            </Field>
            <Field label="Ministry or organisation" name="org" hint="Optional">
              {(p) => <input {...p} type="text" className={controlClass} />}
            </Field>
            <Field label="Anything the team should know?" name="purpose" hint="Optional">
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  className={controlClass}
                  placeholder="Chairs, tables, AV, or anything else you'll need."
                />
              )}
            </Field>
            {facility?.layouts.length ? (
              <ChoiceGroup legend="Seating layout" note="Optional. Tap again to clear.">
                {facility.layouts.map((l) => (
                  <Chip key={l} on={layout === l} onClick={() => setLayout(layout === l ? "" : l)}>
                    {l}
                  </Chip>
                ))}
              </ChoiceGroup>
            ) : null}
          </div>
        ) : null}

        <Stepper
          label={isCourt ? "Players" : "How many people?"}
          name="participants"
          value={participants}
          onChange={setParticipants}
          max={facility?.capacity ?? 200}
          hint={facility?.capacity ? `Up to ${facility.capacity}` : undefined}
          error={errors.participants}
        />

        <ContactFields
          fields={[
            {
              name: "name",
              label: "Your name",
              value: contact?.name ?? "",
              autoComplete: "name",
              required: true,
              error: errors.name,
            },
            {
              name: "email",
              label: "Email",
              value: contact?.email ?? "",
              type: "email",
              autoComplete: "email",
              required: true,
              error: errors.email,
            },
            {
              name: "mobile",
              label: "Mobile",
              value: contact?.mobile ?? "",
              type: "tel",
              autoComplete: "tel",
              hint: "Optional, for same-day changes",
            },
          ]}
        />

        <AcceptRules
          rules={[
            { body: facility?.rules ?? "Leave the space as you found it." },
            { body: "Cancel at least 24 hours ahead if plans change." },
          ]}
          fields={["accept"]}
          label="I accept these on behalf of my group."
          error={errors.accept}
        />

        {result?.formError || earlier ? (
          <p role="alert" className="border-l-2 border-clay pl-4 text-[0.95rem] font-semibold text-clay-deep">
            {result?.formError ?? earlier}{" "}
            {earlier ? (
              <button type="button" onClick={() => setStep(2)} className="underline underline-offset-4">
                Change the time
              </button>
            ) : result?.needsAuth ? (
              <Link href="/sign-in?next=/centris/reserve" className="underline underline-offset-4">
                Sign in
              </Link>
            ) : null}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" tone="ghost" onClick={() => setStep(2)}>
            Back
          </Button>
          <Button type="submit" size="lg" disabled={pending || !timeChosen}>
            {pending ? "Sending…" : facility?.requires_approval ? "Send request" : "Confirm booking"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* --- Confirmation ---------------------------------------------------------- */

function Confirmation({
  reference,
  facility,
  courtName,
  startIso,
  hours,
  participants,
}: {
  reference: string;
  facility: Facility | null;
  courtName: string | null;
  startIso: string | null;
  hours: number;
  participants: number;
}) {
  const pending = facility?.requires_approval ?? false;

  return (
    <div className="mx-auto max-w-2xl">
      <FormSuccess className="p-8">
        <p className="label text-clay">{pending ? "Request sent" : "Booking confirmed"}</p>
        <h2 className="display-md mt-3">
          {pending ? "We'll confirm within a day." : "You're booked."}
        </h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          {pending
            ? "The facilities team will email you once it's approved. Nothing is held until then."
            : "Come to the desk a few minutes early and give your reference."}
        </p>

        <div className="mt-7 border border-dashed border-ink/25 bg-paper-bright p-6 text-center">
          <p className="label text-ink-mute">Reference</p>
          <p className="font-display mt-1 text-3xl tracking-wider tabular">{reference}</p>
        </div>

        <p className="mt-6 text-[0.95rem] leading-relaxed text-ink">
          {[
            facility?.name,
            courtName,
            startIso ? `${fmtDayLong(startIso)}, ${fmtTime(startIso)}` : null,
            `${hours} ${hours === 1 ? "hour" : "hours"}`,
            `${participants} ${participants === 1 ? "person" : "people"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/my/reservations"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            My reservations
          </Link>
          <a
            href="/reserve"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Book something else
          </a>
        </div>
      </FormSuccess>
    </div>
  );
}

/* --- Bits ------------------------------------------------------------------ */

/** Capacity, price and approval on one line. */
function facilityMeta(f: Facility): string {
  return [
    f.capacity ? `Up to ${f.capacity}` : null,
    f.hourly_rate_cents === 0
      ? "Free"
      : f.hourly_rate_cents === null
        ? "Rates to be posted"
        : `${fmtPeso(f.hourly_rate_cents)}/hr`,
    f.requires_approval ? "Needs approval" : "Instant",
  ]
    .filter(Boolean)
    .join(" · ");
}

function Steps({
  step,
  onGo,
  canGo,
}: {
  step: Step;
  onGo: (s: Step) => void;
  canGo: (s: Step) => boolean;
}) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-hairline pb-5">
      {STEPS.map((l, i) => {
        const n = (i + 1) as Step;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        const reachable = n !== step && canGo(n);
        return (
          <li key={l}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(n)}
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                aria-hidden
                className={cx(
                  "label flex h-6 w-6 items-center justify-center border",
                  state === "current" && "border-clay bg-clay text-paper-bright",
                  state === "done" && "border-ink bg-ink text-paper-bright",
                  state === "todo" && "border-hairline text-ink-mute",
                )}
              >
                {state === "done" ? "✓" : n}
              </span>
              <span className={cx("label", state === "todo" ? "text-ink-mute" : "text-ink")}>{l}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** What's been chosen so far, each part a link back to the step that set it. */
function Recap({ items, onChange }: { items: [string, Step][]; onChange: (s: Step) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-bone/60 px-4 py-3 text-[0.9rem]">
      {items.map(([label, s], i) => (
        <span key={`${label}-${i}`} className="flex items-center gap-2">
          {i > 0 ? <span aria-hidden className="text-ink-mute">·</span> : null}
          <button
            type="button"
            onClick={() => onChange(s)}
            className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-clay"
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}

function PanelHead({
  title,
  body,
  ref,
}: {
  title: string;
  body?: string;
  ref: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div>
      <h2 ref={ref} tabIndex={-1} className="display-md outline-none">
        {title}
      </h2>
      {body ? <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">{body}</p> : null}
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <Button type="button" tone="ghost" onClick={onBack}>
        Back
      </Button>
      <Button type="button" onClick={onNext} disabled={nextDisabled}>
        Continue
      </Button>
    </div>
  );
}

/**
 * Rooms have no live grid, so offer the facility's opening hours on `date`,
 * in Manila time whatever the visitor's clock says. Hours already begun are
 * shown as unavailable.
 */
function genericSlots(f: Facility | null, date: string): Slot[] {
  if (!f) return [];
  const open = Number(f.open_time.slice(0, 2));
  const close = Number(f.close_time.slice(0, 2));
  const now = Date.now();
  return Array.from({ length: Math.max(0, close - open) }, (_, i) => {
    const hh = String(open + i).padStart(2, "0");
    const start = new Date(`${date}T${hh}:00:00+08:00`);
    return {
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600_000).toISOString(),
      state: start.getTime() <= now ? ("unavailable" as const) : ("available" as const),
    };
  });
}
