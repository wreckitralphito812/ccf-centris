"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./ui";
import { Field, controlClass } from "./form";

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
      <div className="flex items-center justify-between gap-x-6 gap-y-2 surface px-5 py-4">
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
              className={controlClass}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The step-by-step layout both booking flows use since the design review of
   2026-09-30: numbered questions with big targets, and a bar pinned to the
   bottom with the answers so far and the one button.
   --------------------------------------------------------------------------- */

/** A choice card's look: teal ring when chosen, greyed when it can't be picked. */
export function choiceClass(on: boolean, disabled = false) {
  return cx(
    "rounded-2xl border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay has-[:focus-visible]:ring-offset-2",
    disabled
      ? "cursor-not-allowed border-hairline bg-paper"
      : on
        ? "cursor-pointer border-clay bg-clay/[0.06] ring-2 ring-clay"
        : "cursor-pointer border-hairline bg-paper-bright hover:border-ink/40",
  );
}

/** One numbered question. Its heading (by `id`) labels the choices inside. */
export function Question({
  n,
  id,
  title,
  note,
  error,
  level = 3,
  children,
}: {
  n: number;
  id: string;
  title: string;
  note?: ReactNode;
  error?: string;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <section className="border-t border-hairline py-8 first:border-t-0 first:pt-0">
      <H
        id={id}
        tabIndex={-1}
        className="flex scroll-mt-28 items-center gap-3 text-[1.3rem] font-semibold leading-tight text-ink outline-none sm:text-[1.4rem]"
      >
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay text-[0.95rem] text-paper-bright"
        >
          {n}
        </span>
        {title}
      </H>
      {note ? <p className="mt-1.5 pl-11 text-[1rem] leading-relaxed text-ink-mute">{note}</p> : null}
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
      className="btn-press grid h-14 w-14 shrink-0 place-items-center rounded-full border border-ink/25 bg-paper-bright text-2xl text-ink transition-colors hover:border-ink disabled:opacity-35 disabled:hover:border-ink/25"
    >
      {children}
    </button>
  );
}

/** The headcount box between the − and + buttons. Digits only; empty until chosen. */
export const countInputClass =
  "h-14 w-20 rounded-2xl border border-hairline bg-paper-bright text-center text-3xl font-semibold tabular-nums text-ink focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay";

/** The main button in the pinned bar. */
export const barButtonClass =
  "btn-press shrink-0 rounded-full bg-clay px-6 py-4 text-[1.05rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-mute sm:px-8";

/**
 * The bar pinned to the bottom of the screen. The form above it needs bottom
 * padding (pb-36) so the bar never covers the last field.
 */
export function BookingBar({ width = "max-w-3xl", children }: { width?: string; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper-bright/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(20,32,33,0.18)] backdrop-blur">
      <div className={cx("mx-auto flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-8", width)}>{children}</div>
    </div>
  );
}
