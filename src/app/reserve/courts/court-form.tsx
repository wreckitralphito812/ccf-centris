"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { reserveCourt, type CourtBookingResult } from "@/app/actions/court-rentals";
import {
  AddToCalendar,
  BookingBar,
  Confirmation,
  ContactFields,
  DayCircle,
  IconLine,
  PolicyAgreement,
  Question,
  barButtonClass,
  calmChipClass,
  choiceClass,
  revealNext,
} from "@/components/booking";
import { cx } from "@/components/ui";
import { PICTURE_ACCEPT, prepareReceipt } from "@/lib/upload-image";
import { SITE } from "@/lib/site";
import {
  COURT_POLICIES,
  MAX_HOURS,
  dayLabel,
  freeThrough,
  peso,
  priceOf,
  sportInfo,
  sportsOn,
  timeRange,
  windowsFor,
  type CourtHold,
  type Sport,
} from "@/lib/court-rentals";

export interface CourtDgroupOption {
  id: string;
  name: string;
  leaderName: string;
  leaderMobile: string;
}

/** The form, remounted fresh for each new booking after a confirmation. */
export function CourtForm(props: {
  days: string[];
  holds: CourtHold[] | null;
  email: string;
  name: string;
  mobile: string;
  dgroups: CourtDgroupOption[];
}) {
  const [attempt, setAttempt] = useState(0);
  return <CourtAttempt key={attempt} {...props} onAnother={() => setAttempt((a) => a + 1)} />;
}

/** Where to move focus for each field the server sent back, in page order. */
const ERROR_TARGETS: [keyof NonNullable<CourtBookingResult["fieldErrors"]>, string][] = [
  ["date", "#q-day"],
  ["sport", "#q-sport"],
  ["hours", "#q-hours"],
  ["courts", "#q-courts"],
  ["start", "#q-time"],
  ["renterName", "[name=renter_name]"],
  ["renterEmail", "[name=renter_email]"],
  ["contactMobile", "[name=contact_mobile]"],
  ["proof", "#q-pay"],
  ["policies", "#rules-ok"],
];

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * The questions on one calm card, the payment on a second, and the bar pinned
 * to the bottom with the total and the one button, like the Dgroup tables
 * (design review, 2026-09-30). Times say how many courts are left, and only
 * hours inside the sport's window on Adrian's schedule are offered.
 */
function CourtAttempt({
  days,
  holds,
  email,
  name,
  mobile,
  dgroups,
  onAnother,
}: {
  days: string[];
  holds: CourtHold[] | null;
  email: string;
  name: string;
  mobile: string;
  dgroups: CourtDgroupOption[];
  onAnother: () => void;
}) {
  const [state, action, pending] = useActionState<CourtBookingResult | null, FormData>(reserveCourt, null);
  const [dgroupId, setDgroupId] = useState(dgroups[0]?.id ?? "");
  const group = dgroups.find((g) => g.id === dgroupId);
  const [date, setDate] = useState(days[0] ?? "");
  const [picked, setPicked] = useState<Sport | "">("");
  const [hours, setHours] = useState(0);
  const [courtsPicked, setCourtsPicked] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const e = state?.fieldErrors ?? {};

  // A day with one sport has it picked already.
  const open = date ? sportsOn(date) : [];
  const sport: Sport | "" = open.some((s) => s.id === picked) ? picked : open.length === 1 ? open[0].id : "";
  const info = sport ? sportInfo(sport) : null;
  const courts = info?.courts === 1 ? 1 : courtsPicked;

  const free = (h: number) => (holds && sport ? freeThrough(sport, date, h, hours || 1, holds) : undefined);
  const starts = sport && hours ? windowsFor(date, sport).flatMap((w) => Array.from({ length: Math.max(0, w.to - w.from - hours + 1) }, (_, i) => w.from + i)) : [];
  const usable = (h: number) => {
    const f = free(h);
    return f === undefined || f >= Math.max(courts, 1);
  };
  const chosen = start !== null && starts.includes(start) && usable(start) ? start : null;
  const total = sport && courts && hours ? priceOf(sport, courts, hours) : 0;

  const dayFull = (d: string) =>
    Boolean(holds) && sportsOn(d).every((s) => windowsFor(d, s.id).every((w) => Array.from({ length: w.to - w.from }, (_, i) => w.from + i).every((h) => freeThrough(s.id, d, h, 1, holds!) === 0)));

  const missing = !date
    ? "Choose a day"
    : !sport
      ? "Choose a sport"
      : !hours
        ? "How many hours?"
        : !courts
          ? "How many courts?"
          : chosen === null
            ? "Choose a time"
            : !proof
              ? "Upload your payment"
              : !agreed
                ? "Tick the rental rules"
                : null;

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

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pickProof(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    setProofNote(null);
    try {
      const ready = await prepareReceipt(file);
      setProof(ready);
      setPreview(URL.createObjectURL(ready));
    } catch (err) {
      setProof(null);
      setPreview(null);
      setProofNote((err as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  if (state?.ok && state.rental) {
    const r = state.rental;
    return (
      <Confirmation
        focusRef={doneRef}
        title="You’re booked"
        note={r.emailed ? `We’ve emailed the details to ${r.email}.` : `Your rental is saved. We couldn’t email ${r.email} just now.`}
      >
        <div className="space-y-3">
          <p className="text-[1.3rem] font-semibold leading-snug text-ink">
            {r.sport} · {r.courts}
          </p>
          <IconLine icon="calendar">{dayLabel(r.date)}</IconLine>
          <IconLine icon="clock">{timeRange(r.start, r.hours)}</IconLine>
          <IconLine icon="check">Paid {r.amount}. The team checks every payment.</IconLine>
          <IconLine icon="pin">Gym · {SITE.addressLines.slice(0, 2).join(", ")}</IconLine>
        </div>
        <AddToCalendar
          bare
          event={{
            uid: `court-${r.id}`,
            title: `${r.sport} · Gym, CCF Centris`,
            date: r.date,
            start: pad(r.start),
            end: pad(r.start + r.hours),
            details: `${r.sport}, ${r.courts.toLowerCase()}, in the Gym at ${SITE.name}. Move it at ${SITE.url}/my/reservations`,
          }}
        />
        <p className="text-[0.98rem] text-ink-mute">Rentals can’t be cancelled, but you can move yours to another open time.</p>
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

  if (!days.length) {
    return <p className="calm-card px-8 py-10 text-center text-[1.05rem] text-ink-mute">No days are open right now. Days open a week ahead.</p>;
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="pb-36"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (missing || pending || preparing || !proof) return;
        const fd = new FormData(ev.currentTarget);
        fd.set("proof", proof, proof.name);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="dgroup_id" value={dgroupId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="hours" value={hours || ""} />
      <input type="hidden" name="courts" value={courts || ""} />
      <input type="hidden" name="start" value={chosen ?? ""} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10">
          {dgroups.length > 1 ? (
            <Question id="q-group" title="Which Dgroup?" note="Pick yours and we fill in the rest.">
              <div role="radiogroup" aria-labelledby="q-group" className="flex flex-wrap gap-2">
                {dgroups.map((g) => {
                  const on = dgroupId === g.id;
                  return (
                    <label key={g.id} className={cx("inline-flex min-h-12 items-center px-4 py-2 text-[1rem]", choiceClass(on, false))}>
                      <input type="radio" name="pick_group" value={g.id} checked={on} onChange={() => setDgroupId(g.id)} className="sr-only" />
                      <span className={cx(on && "font-semibold")}>{g.name}</span>
                    </label>
                  );
                })}
              </div>
            </Question>
          ) : null}

          <Question id="q-day" title="Which day?" note="From tomorrow, up to a week ahead." error={e.date}>
            <div
              role="radiogroup"
              aria-labelledby="q-day"
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 5)}, minmax(0, 1fr))` }}
            >
              {days.map((d) => {
                const [weekday, rest] = dayLabel(d).split(", ");
                const full = dayFull(d);
                return (
                  <DayCircle
                    key={d}
                    name="pick_date"
                    value={d}
                    weekday={weekday.slice(0, 3)}
                    day={rest.split(" ")[1]}
                    on={date === d}
                    disabled={full}
                    note={full ? "Full" : undefined}
                    onChange={() => {
                      setDate(d);
                      setStart(null);
                      revealNext("q-sport");
                    }}
                  />
                );
              })}
            </div>
          </Question>

          <Question
            id="q-sport"
            title="Which sport?"
            note={open.length === 1 ? `Only ${open[0].name.toLowerCase()} is open on ${dayLabel(date).split(",")[0]}.` : "Each time is set aside for one sport."}
            error={e.sport}
          >
            <div role="radiogroup" aria-labelledby="q-sport" className="flex flex-wrap gap-2">
              {open.map((s) => {
                const on = sport === s.id;
                return (
                  <label key={s.id} className={calmChipClass(on)}>
                    <input
                      type="radio"
                      name="pick_sport"
                      value={s.id}
                      checked={on}
                      onChange={() => {
                        setPicked(s.id);
                        setStart(null);
                        revealNext("q-hours");
                      }}
                      className="sr-only"
                    />
                    <span className={cx(on && "font-semibold")}>{s.name}</span>
                    <span className={cx("text-[0.9rem]", on ? "text-paper-bright/85" : "text-ink-mute")}>
                      {s.courts > 1 ? `${peso(s.rate)} a court an hour` : `${peso(s.rate)} an hour`}
                    </span>
                  </label>
                );
              })}
            </div>
          </Question>

          <Question id="q-hours" title="How long?" note={`Whole hours, up to ${MAX_HOURS}.`} error={e.hours}>
            <div role="radiogroup" aria-labelledby="q-hours" className="flex flex-wrap gap-2">
              {Array.from({ length: MAX_HOURS }, (_, i) => i + 1).map((n) => (
                <label key={n} className={calmChipClass(hours === n)}>
                  <input
                    type="radio"
                    name="pick_hours"
                    value={n}
                    checked={hours === n}
                    onChange={() => {
                      setHours(n);
                      revealNext(info && info.courts > 1 ? "q-courts" : "q-time");
                    }}
                    className="sr-only"
                  />
                  <span className={cx(hours === n && "font-semibold")}>
                    {n} {n === 1 ? "hour" : "hours"}
                  </span>
                </label>
              ))}
            </div>
          </Question>

          {info && info.courts > 1 ? (
            <Question id="q-courts" title="How many courts?" note={`Up to ${info.courts}, at ${peso(info.rate)} each an hour.`} error={e.courts}>
              <div role="radiogroup" aria-labelledby="q-courts" className="flex flex-wrap gap-2">
                {Array.from({ length: info.courts }, (_, i) => i + 1).map((n) => (
                  <label key={n} className={calmChipClass(courts === n)}>
                    <input
                      type="radio"
                      name="pick_courts"
                      value={n}
                      checked={courts === n}
                      onChange={() => {
                        setCourtsPicked(n);
                        revealNext("q-time");
                      }}
                      className="sr-only"
                    />
                    <span className={cx(courts === n && "font-semibold")}>
                      {n} {n === 1 ? "court" : "courts"}
                    </span>
                  </label>
                ))}
              </div>
            </Question>
          ) : null}

          <Question id="q-time" title="What time?" note={date ? dayLabel(date) : undefined} error={e.start}>
            {!sport || !hours ? (
              <p className="text-[1rem] text-ink-mute">Pick a sport and how long first.</p>
            ) : (
              <div role="radiogroup" aria-labelledby="q-time" className="grid gap-3 sm:grid-cols-2">
                {starts.map((h) => {
                  const ok = usable(h);
                  const on = chosen === h;
                  return (
                    <label key={h} className={cx("flex min-h-[3.75rem] items-center justify-between gap-3 px-4 py-4", choiceClass(on, !ok))}>
                      <input
                        type="radio"
                        name="pick_start"
                        value={h}
                        checked={on}
                        disabled={!ok}
                        onChange={() => {
                          setStart(h);
                          revealNext("q-details");
                        }}
                        className="sr-only"
                      />
                      <span className={cx("whitespace-nowrap text-[1.02rem]", ok && "font-semibold")}>{timeRange(h, hours)}</span>
                      <CourtStatus free={free(h)} need={courts} total={info?.courts ?? 1} on={on} />
                    </label>
                  );
                })}
              </div>
            )}
          </Question>
        </div>

        <div className="calm-card px-6 py-8 sm:px-9 sm:py-10 lg:sticky lg:top-24">
          <Question id="q-details" title="Your details">
            <ContactFields
              key={dgroupId || "none"}
              fields={[
                { name: "renter_name", label: "Your name", value: group?.leaderName || name, autoComplete: "name", required: true, error: e.renterName },
                {
                  name: "renter_email",
                  label: "Email",
                  value: email,
                  type: "email",
                  autoComplete: "email",
                  required: true,
                  hint: "Your confirmation is sent here.",
                  error: e.renterEmail,
                },
                {
                  name: "contact_mobile",
                  label: "Mobile number",
                  value: group?.leaderMobile || mobile,
                  type: "tel",
                  autoComplete: "tel",
                  required: true,
                  error: e.contactMobile,
                },
              ]}
            />
          </Question>

          <Question
            id="q-pay"
            title={total ? `Pay ${peso(total)}` : "Pay"}
            note="Scan the QR code with your e-wallet or banking app, then upload a screenshot of the payment."
            error={e.proof ?? proofNote ?? undefined}
          >
            <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
              {/* The CCF Centris giving QR, as Adrian sent it (2026-10-20). */}
              <a
                href="/payments/ccf-centris-qr.webp"
                target="_blank"
                rel="noreferrer"
                className="mx-auto block w-full max-w-[12rem] overflow-hidden rounded-xl border border-hairline sm:mx-0 sm:max-w-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/payments/ccf-centris-qr.webp" alt="CCF Centris payment QR code, for e-wallets and banking apps" width={1080} height={1920} className="h-auto w-full" />
              </a>
              <div>
                <p className="mb-3 text-[0.92rem] leading-relaxed text-ink-mute sm:hidden">
                  Paying on this phone? Tap the QR code, save the picture, then choose it from your gallery in your e-wallet or banking app.
                </p>
                {total ? (
                  <p className="text-[1rem] text-ink-soft">
                    {info?.name}, {courts} {courts === 1 ? "court" : "courts"} × {hours} {hours === 1 ? "hour" : "hours"}:{" "}
                    <span className="font-semibold text-ink tabular-nums">{peso(total)}</span>
                  </p>
                ) : (
                  <p className="text-[1rem] text-ink-mute">The amount shows once you’ve picked a sport, hours and courts.</p>
                )}
                <label
                  className={cx(
                    "btn-press mt-4 inline-flex min-h-12 cursor-pointer items-center rounded-lg border px-5 text-[1rem] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                    proof ? "border-edge bg-paper-bright text-clay hover:border-clay/50" : "border-clay bg-clay text-paper-bright hover:bg-clay-deep",
                  )}
                >
                  <input
                    type="file"
                    accept={PICTURE_ACCEPT}
                    className="sr-only"
                    onChange={(ev) => {
                      void pickProof(ev.target.files?.[0]);
                      ev.target.value = "";
                    }}
                  />
                  {preparing ? "Preparing…" : proof ? "Change the screenshot" : "Upload the screenshot"}
                </label>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Your payment screenshot" className="mt-4 max-h-56 w-auto rounded-xl border border-hairline" />
                ) : null}
              </div>
            </div>
          </Question>

          <Question id="q-rules" title="The rental rules">
            <PolicyAgreement
              id="rules-ok"
              policies={[...COURT_POLICIES]}
              label="I’ve paid, and I agree to the rental rules."
              checked={agreed}
              onChange={setAgreed}
              error={e.policies}
            />
            {agreed ? COURT_POLICIES.map((p) => <input key={p.id} type="hidden" name={`policy_${p.id}`} value="on" />) : null}
          </Question>
        </div>
      </div>

      {state?.formError ? (
        <p id="form-error" tabIndex={-1} role="alert" className="mt-6 rounded-2xl bg-sky-wash px-5 py-4 text-[1rem] font-semibold text-sky outline-none">
          {state.formError}
          {state.needsAuth ? (
            <>
              {" "}
              <Link href="/sign-in?next=/reserve/courts" className="underline underline-offset-4">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <BookingBar width="max-w-2xl lg:max-w-6xl">
        <div className="min-w-0 flex-1 leading-snug" aria-live="polite">
          {sport && date ? (
            <span className="block truncate text-[1rem] font-semibold text-ink">
              {info?.name} · {dayLabel(date).slice(0, 3)}
              {chosen !== null && hours ? `, ${timeRange(chosen, hours).split(" – ")[0]}` : ""}
            </span>
          ) : null}
          <span className="block truncate text-[0.92rem] text-ink-mute">{missing ?? `${peso(total)} paid`}</span>
        </div>
        <button type="submit" disabled={!!missing || pending || preparing} className={barButtonClass}>
          {pending ? "Booking…" : "Book my court"}
        </button>
      </BookingBar>
    </form>
  );
}

/** "3 free", "1 of 3 free", "Full", or "Only 1 free" when the group wants more. Short, to fit two columns. */
function CourtStatus({ free, need, total, on }: { free?: number; need: number; total: number; on: boolean }) {
  if (free === undefined) return null;
  const [text, tone] =
    free === 0
      ? ["Full", "text-ink-mute"]
      : total === 1
        ? ["Free", on ? "text-paper-bright/85" : "text-moss"]
        : need > free
          ? [`Only ${free} free`, "text-ink-mute"]
          : free < total
            ? [`${free} of ${total} free`, on ? "text-paper-bright" : "font-semibold text-clay-deep"]
            : [`${free} free`, on ? "text-paper-bright/85" : "text-moss"];
  return <span className={cx("shrink-0 text-right text-[0.9rem] font-medium", tone)}>{text}</span>;
}
