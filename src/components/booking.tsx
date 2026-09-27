"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./ui";
import { Field, controlClass } from "./form";

/* ---------------------------------------------------------------------------
   Pieces shared by the booking flows (Dgroup tables, courts and rooms), so
   both ask for a day, a time, a headcount and contact details the same way.
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
        "btn-press border px-4 py-2.5 text-[0.9rem] font-semibold transition-colors",
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

/** − n + for a headcount, posted as a hidden field named `name`. */
export function Stepper({
  label,
  name,
  value,
  onChange,
  min = 1,
  max,
  hint,
  error,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  hint?: string;
  error?: string;
}) {
  const btn =
    "btn-press flex h-10 w-10 items-center justify-center border border-ink/25 text-lg transition-colors hover:border-ink disabled:opacity-40 disabled:hover:border-ink/25";
  return (
    <div>
      <p className="label text-ink-mute">{label}</p>
      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          aria-label="Fewer"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={btn}
        >
          −
        </button>
        <output aria-live="polite" className="font-display w-10 text-center text-2xl tabular-nums">
          {value}
        </output>
        <button
          type="button"
          aria-label="More"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={btn}
        >
          +
        </button>
        {hint ? <span className="text-[0.82rem] text-ink-mute">{hint}</span> : null}
      </div>
      <input type="hidden" name={name} value={value} />
      {error ? (
        <p role="alert" className="mt-2 text-[0.82rem] font-semibold text-clay-deep">
          {error}
        </p>
      ) : null}
    </div>
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
 * none has an error, they fold into a single "Booking as" line with an Edit
 * link, so a signed-in member doesn't retype what we know. The values still
 * post, as hidden fields, either way.
 */
export function ContactFields({ fields }: { fields: ContactField[] }) {
  const complete = fields.every((f) => !f.required || f.value.trim());
  const hasError = fields.some((f) => f.error);
  const [editing, setEditing] = useState(!complete || hasError);

  if (!editing && !hasError) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border border-hairline bg-paper-bright px-5 py-4">
        <div className="min-w-0">
          <p className="label text-ink-mute">Booking as</p>
          <p className="mt-1 break-words text-[0.95rem] text-ink">
            {fields
              .map((f) => f.value.trim())
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="label text-clay underline underline-offset-4 hover:text-clay-deep"
        >
          Edit
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

/**
 * The rules as a short list and one checkbox to accept them all. `fields`
 * are the names the action expects; each posts "on" once the box is ticked.
 */
export function AcceptRules({
  rules,
  fields,
  label,
  error,
}: {
  rules: { title?: string; body: string }[];
  fields: string[];
  label: string;
  error?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="border border-hairline bg-paper-bright p-5">
      <ul className="space-y-2 text-[0.88rem] leading-relaxed text-ink-soft">
        {rules.map((r) => (
          <li key={r.title ?? r.body} className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-clay" />
            <span>
              {r.title ? <span className="font-semibold text-ink">{r.title}. </span> : null}
              {r.body}
            </span>
          </li>
        ))}
      </ul>
      <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-hairline pt-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-clay"
        />
        <span className="text-[0.92rem] font-semibold text-ink">{label}</span>
      </label>
      {accepted
        ? fields.map((f) => <input key={f} type="hidden" name={f} value="on" />)
        : null}
      {error ? (
        <p role="alert" className="mt-2 text-[0.82rem] font-semibold text-clay-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
