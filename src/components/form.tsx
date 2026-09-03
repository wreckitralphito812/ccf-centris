"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { cx } from "./ui";

/* ---------------------------------------------------------------------------
   Form primitives. Client-only — they use hooks — so they live here rather
   than in ui.tsx, which is imported by Server Components.
   --------------------------------------------------------------------------- */

/**
 * Shared control styling for inputs, selects and textareas.
 *
 * Focus is a real 2px ring — the global `input:focus-visible` rule in
 * globals.css — not a 1px border-colour shift, and never `outline-none`. An
 * invalid control turns its border clay; the message and aria-describedby
 * wiring live in <Field>.
 */
export const controlClass =
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] " +
  "aria-[invalid=true]:border-clay aria-[invalid=true]:bg-clay/5";

/**
 * Label + optional hint + optional error, wrapping one control.
 *
 * Pass the control as a function so it receives the generated id and aria
 * props: `<Field label="Email" name="email" error={err}>{p => <input {...p} />}</Field>`.
 * A `name` is required so validation can focus the first invalid control.
 */
export function Field({
  label,
  name,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    "aria-required"?: true;
  }) => ReactNode;
  className?: string;
}) {
  const base = useId();
  const id = `${base}-f`;
  const hintId = `${base}-h`;
  const errId = `${base}-e`;
  const describedBy =
    [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cx("block", className)}>
      <label htmlFor={id} className="label block text-ink-mute">
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </label>
      {hint ? (
        <span id={hintId} className="mt-1 block text-[0.8rem] text-ink-mute">
          {hint}
        </span>
      ) : null}
      <span className="mt-2 block">
        {children({
          id,
          name,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
        })}
      </span>
      {error ? (
        <span
          id={errId}
          className="mt-1.5 flex items-center gap-1.5 text-[0.8rem] font-semibold text-clay-deep"
        >
          <span aria-hidden>!</span>
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Confirmation shown after a form submits. Announces itself (role="status")
 * and takes focus on mount, so a screen-reader user hears the outcome instead
 * of the form silently vanishing.
 */
export function FormSuccess({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className={cx("border border-clay bg-clay/8 p-7 outline-none", className)}
    >
      {children}
    </div>
  );
}

/**
 * On submit: if any entry in `errors` is set, move focus to the first invalid
 * control inside `formEl` and return false. Call from onSubmit and bail when
 * it returns false.
 */
export function focusFirstInvalid(
  errors: Record<string, string | undefined>,
  formEl: HTMLFormElement | null,
) {
  const first = Object.entries(errors).find(([, v]) => v)?.[0];
  if (first && formEl) {
    formEl.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }
  return !first;
}
