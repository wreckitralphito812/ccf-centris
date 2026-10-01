"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./ui";
import { formatPhMobile } from "@/lib/phone";

/*
 * The sign-in and sign-up form pieces (2026-09-30), after the Uiverse form Ralph
 * picked, drawn in the site's calm look: a label over a soft filled field with
 * an icon inside it, a show/hide eye on passwords, "Or with", and Google.
 */

const FIELD =
  "flex min-h-[3.4rem] items-center gap-3 rounded-[0.875rem] bg-mist px-4 transition-[box-shadow,background-color] focus-within:bg-paper-bright focus-within:ring-2 focus-within:ring-clay";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

/** A labelled field with an icon inside it. */
export function IconField({
  id,
  label,
  icon,
  error,
  hint,
  children,
  ...input
}: InputProps & {
  id: string;
  label: string;
  icon: "email" | "person" | "lock" | "phone";
  error?: string;
  hint?: string;
  children?: ReactNode;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-[0.95rem] font-medium text-ink">
        {label}
      </label>
      <div className={cx(FIELD, "mt-2", error && "bg-sky-wash ring-1 ring-sky/40")}>
        <FieldIcon name={icon} />
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent py-3 text-[1rem] text-ink placeholder:text-ink-mute/70 focus:outline-none"
          {...input}
        />
        {children}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.88rem] text-ink-mute">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.9rem] font-medium text-sky">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A password field with a show/hide eye. */
export function PasswordField(props: Omit<Parameters<typeof IconField>[0], "icon" | "type">) {
  const [shown, setShown] = useState(false);
  return (
    <IconField {...props} icon="lock" type={shown ? "text" : "password"}>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-mute transition-colors hover:text-clay"
      >
        <EyeIcon off={shown} />
      </button>
    </IconField>
  );
}

/** A Philippine mobile number, formatted as typed: 0917 123 4567. */
export function PhoneField({
  value,
  onValue,
  ...props
}: Omit<Parameters<typeof IconField>[0], "icon" | "type" | "value" | "onChange"> & {
  value: string;
  onValue: (v: string) => void;
}) {
  return (
    <IconField
      {...props}
      icon="phone"
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="0917 123 4567"
      maxLength={13}
      value={value}
      onChange={(ev) => onValue(formatPhMobile(ev.target.value))}
    />
  );
}

/** "Or with", between the password form and Google. */
export function OrDivider({ children = "Or with" }: { children?: ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-rule" />
      <span className="text-[0.92rem] text-ink-mute">{children}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/** A form-wide message: an error (maroon), good news (teal) or a plain note (grey). */
export function FormNote({ tone = "error", children }: { tone?: "error" | "ok" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-xl px-4 py-3 text-[0.92rem] leading-relaxed",
        tone === "error" ? "bg-sky-wash text-sky" : tone === "ok" ? "bg-clay-wash text-clay-deep" : "bg-mist text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

export const submitClass =
  "btn-press w-full rounded-full bg-clay px-6 py-3.5 text-[1rem] font-semibold text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)] transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-60";

function FieldIcon({ name }: { name: "email" | "person" | "lock" | "phone" }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "h-5 w-5 shrink-0 text-ink-mute",
  };
  if (name === "email")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.5 7.1" />
      </svg>
    );
  if (name === "phone")
    return (
      <svg {...p}>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </svg>
    );
  if (name === "person")
    return (
      <svg {...p}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8" />
      </svg>
    );
  return (
    <svg {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
