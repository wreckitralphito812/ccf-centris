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
