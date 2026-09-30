"use client";

import { useState, type ReactNode, type Ref } from "react";
import { cx } from "./ui";
import { Field } from "./form";
import { UiIcon, type UiIconName } from "./icons";
import { googleCalendarLink, icsHref, type CalendarEvent } from "@/lib/calendar";
import type { BadgeTone } from "@/lib/booking-status";

/* ---------------------------------------------------------------------------
   Pieces shared by the booking flows (Dgroup tables, courts and rooms), so
   they ask for a day, a time, a headcount and contact details the same way.
   --------------------------------------------------------------------------- */

/** One choice in a row of tap targets: a day, a time, a court. */
export function Chip({
  on,
  disabled,
  onClick,
  children,
  className,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "btn-press rounded-full border px-4 py-2.5 text-[0.9rem] font-semibold transition-colors",
        disabled && "cursor-not-allowed border-transparent bg-ink/5 text-ink-mute/50 line-through",
        !disabled && on && "border-clay bg-clay text-paper-bright",
        !disabled && !on && "border-ink/25 bg-paper-bright text-ink hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A labelled group of choices, with an optional note and error under it. */
export function ChoiceGroup({
  legend,
  note,
  error,
  children,
}: {
  legend: string;
  note?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="label text-ink-mute">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      {note ? <p className="mt-2 text-[0.82rem] text-ink-mute">{note}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-[0.82rem] font-semibold text-clay-deep">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface ContactField {
  name: string;
  label: string;
  value: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

/**
 * Name, email and mobile. When the account already has every required one and
 * none has an error, they fold into one card (the name, then the rest) with a
 * Change button, so a signed-in member doesn't retype what we know. The values still
 * post, as hidden fields, either way.
 */
export function ContactFields({ fields }: { fields: ContactField[] }) {
  const complete = fields.every((f) => !f.required || f.value.trim());
  const hasError = fields.some((f) => f.error);
  const [editing, setEditing] = useState(!complete || hasError);

  if (!editing && !hasError) {
    return (
      <div className="flex items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-mist px-5 py-4">
        <div className="min-w-0 text-[1.05rem] leading-relaxed">
          <p className="break-words font-semibold text-ink">{fields[0]?.value.trim()}</p>
          {fields.slice(1).map((f) =>
            f.value.trim() ? (
              <p key={f.name} className="break-words text-ink-soft">
                {f.value.trim()}
              </p>
            ) : null,
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 shrink-0 text-[0.98rem] font-semibold text-clay underline underline-offset-4 hover:text-clay-deep"
        >
          Change
        </button>
        {fields.map((f) => (
          <input key={f.name} type="hidden" name={f.name} value={f.value} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f, i) => (
        <Field
          key={f.name}
          label={f.label}
          name={f.name}
          hint={f.hint}
          error={f.error}
          required={f.required}
          className={i === 0 ? "sm:col-span-2" : undefined}
        >
          {(p) => (
            <input
              {...p}
              type={f.type ?? "text"}
              inputMode={f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
              autoComplete={f.autoComplete}
              defaultValue={f.value}
              className="calm-input"
            />
          )}
        </Field>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The calm booking kit (design review 2026-09-30, Calendly-inspired): plain
   question headings on one big card, soft choice rows that turn solid teal
   when chosen, date circles for days, and a bar pinned to the bottom with the
   answers so far and the one button.
   --------------------------------------------------------------------------- */

/** A choice row's look: soft edge, solid teal when chosen, faded when it can't be picked. */
export function choiceClass(on: boolean, disabled = false) {
  return cx(
    "rounded-[0.875rem] border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay has-[:focus-visible]:ring-offset-2",
    disabled
      ? "cursor-not-allowed border-rule bg-mist text-ink-mute"
      : on
        ? "cursor-pointer border-clay bg-clay text-paper-bright"
        : "cursor-pointer border-edge bg-paper-bright text-ink hover:border-clay/50",
  );
}

/** A soft pill choice (set-up, food, equipment). */
export const calmChipClass = (on: boolean) =>
  cx(
    "btn-press inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-5 text-[1rem] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
    on ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay/50",
  );

/** One question in a booking card. Its heading (by `id`) labels the choices inside. */
export function Question({
  id,
  title,
  note,
  error,
  level = 3,
  children,
}: {
  id: string;
  title: string;
  note?: ReactNode;
  error?: string;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <section className="border-t border-rule py-8 first:border-t-0 first:pt-0 last:pb-0">
      <H
        id={id}
        tabIndex={-1}
        className="scroll-mt-28 text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] text-ink outline-none"
      >
        {title}
      </H>
      {note ? <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-mute">{note}</p> : null}
      <div className="mt-5">{children}</div>
      <FieldError text={error} />
    </section>
  );
}

export function FieldError({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-3 text-[1rem] font-semibold text-clay-deep">
      {text}
    </p>
  ) : null;
}

/** A day as a date circle (Calendly-style): the weekday over the date, a note under it. */
export function DayCircle({
  name,
  value,
  weekday,
  day,
  on,
  disabled,
  note,
  onChange,
}: {
  name: string;
  value: string;
  weekday: string;
  day: string | number;
  on: boolean;
  disabled?: boolean;
  note?: string;
  onChange: () => void;
}) {
  return (
    <label className={cx("group flex flex-col items-center gap-2 text-center", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-mute">{weekday}</span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={on}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cx(
          "grid h-11 w-11 place-items-center rounded-full text-[1.05rem] font-semibold tabular-nums sm:h-12 sm:w-12 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay peer-focus-visible:ring-offset-2",
          disabled
            ? "text-ink-mute/45"
            : on
              ? "bg-clay text-paper-bright shadow-[0_6px_14px_-4px_rgba(0,118,130,0.45)]"
              : "bg-clay-wash text-clay group-hover:bg-clay/15",
        )}
      >
        {day}
      </span>
      <span className="h-4 text-[0.72rem] text-ink-mute">{note ?? ""}</span>
    </label>
  );
}

const BADGE: Record<BadgeTone, string> = {
  ok: "bg-clay-wash text-clay-deep",
  wait: "bg-sky-wash text-sky",
  grey: "bg-rule text-ink-mute",
};

/** A small rounded status tag: Confirmed (teal), Awaiting approval (maroon), the rest grey. */
export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.8rem] font-medium", BADGE[tone])}>
      {children}
    </span>
  );
}

/** One fact with its line icon. */
export function IconLine({ icon, children }: { icon: UiIconName; children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 text-[1rem] leading-snug text-ink-soft">
      <UiIcon name={icon} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-clay" />
      <span>{children}</span>
    </p>
  );
}

/** A big round − or + for a headcount. */
export function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="btn-press grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full border border-edge bg-paper-bright text-2xl text-clay transition-colors hover:border-clay disabled:text-ink-mute/40 disabled:hover:border-edge"
    >
      {children}
    </button>
  );
}

/** The headcount box between the − and + buttons. Digits only; empty until chosen. */
export const countInputClass =
  "h-[3.25rem] w-[4.5rem] rounded-[0.875rem] bg-mist text-center text-[1.5rem] font-semibold tabular-nums text-ink focus:bg-paper-bright focus:outline-none focus:ring-2 focus:ring-clay";

/** The main button in the pinned bar. */
export const barButtonClass =
  "btn-press shrink-0 rounded-full bg-clay px-6 py-4 text-[1rem] font-semibold text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)] transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink-mute disabled:shadow-none sm:px-8";

/**
 * The bar pinned to the bottom of the screen. The form above it needs bottom
 * padding (pb-36) so the bar never covers the last field.
 */
export function BookingBar({ width = "max-w-2xl", children }: { width?: string; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-bright/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className={cx("mx-auto flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-8", width)}>{children}</div>
    </div>
  );
}

/** The centred card both flows end on: "You're booked" or "Request sent". */
export function Confirmation({
  title,
  note,
  focusRef,
  children,
}: {
  title: string;
  note: ReactNode;
  focusRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      role="status"
      className="calm-card mx-auto max-w-[35rem] px-7 py-10 text-center outline-none sm:px-10"
    >
      <span
        aria-hidden
        className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-clay text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)]"
      >
        <UiIcon name="check" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 text-[1rem] text-ink-mute">{note}</p>
      <div className="mt-8 space-y-6 border-t border-rule pt-7 text-left">{children}</div>
    </div>
  );
}

/**
 * Add to calendar: Google Calendar in a new tab, or an .ics file for Apple
 * Calendar and Outlook. `bare` drops the label, inside a Confirmation.
 */
export function AddToCalendar({ event, bare = false }: { event: CalendarEvent; bare?: boolean }) {
  const base =
    "btn-press inline-flex min-h-12 items-center gap-2 rounded-full border border-clay px-5 py-2.5 text-[0.98rem] font-semibold transition-colors";
  return (
    <div>
      {bare ? null : <p className="text-[1rem] font-semibold text-ink">Add it to your calendar</p>}
      <div className={cx("flex flex-wrap gap-2.5", !bare && "mt-3")}>
        <a
          href={googleCalendarLink(event)}
          target="_blank"
          rel="noreferrer"
          className={cx(base, "bg-clay text-paper-bright hover:bg-clay-deep")}
        >
          <UiIcon name="calendar" className="h-4 w-4" />
          Google Calendar
        </a>
        <a href={icsHref(event)} download="ccf-centris.ics" className={cx(base, "text-clay hover:bg-clay-wash")}>
          <UiIcon name="calendar" className="h-4 w-4" />
          Apple or Outlook
        </a>
      </div>
    </div>
  );
}
