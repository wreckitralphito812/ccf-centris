"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Pill } from "@/components/ui";
import {
  Field,
  FormSuccess,
  controlClass,
  focusFirstInvalid,
} from "@/components/form";
import { fmtPeso } from "@/lib/format";

/**
 * Event registration.
 *
 * A full event puts people on a waitlist rather than turning them away, and
 * says so plainly. Paid events stop at "reserved, pay on arrival" because no
 * payment provider is connected: the flow is real, the charge is not, and the
 * copy never implies otherwise.
 */

type Errors = Partial<Record<"name" | "email", string>>;

export function RegisterForm({
  eventTitle,
  priceCents,
  full,
  requiresRegistration,
}: {
  eventTitle: string;
  priceCents: number;
  full: boolean;
  requiresRegistration: boolean;
}) {
  const [done, setDone] = useState(false);
  const [party, setParty] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Deterministic-looking reference so the confirmation feels real.
  const ref = `CEN-${eventTitle.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${String(
    (eventTitle.length * 7919) % 9000 + 1000,
  )}`;

  function validate(): boolean {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Tell us your name.";
    if (!form.email.trim()) next.email = "We need an email to reach you.";
    else if (!/.+@.+\..+/.test(form.email))
      next.email = "That does not look like an email address.";
    setErrors(next);
    return focusFirstInvalid(next, formRef.current);
  }

  if (!requiresRegistration) {
    return (
      <div className="border border-hairline bg-paper-bright p-7">
        <Pill tone="moss">No registration needed</Pill>
        <h2 className="font-display mt-4 text-2xl leading-tight">
          Just turn up.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          There is no list and no ticket for this one. Just turn up, and bring
          whoever you like.
        </p>
        <Link
          href="/visit#getting-here"
          className="label mt-5 inline-block text-clay underline underline-offset-4"
        >
          How to get here
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <FormSuccess>
        <p className="label text-clay">
          {full ? "You're on the waitlist" : "You're registered"}
        </p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          {full ? "We'll email if a place opens." : "See you there."}
        </h2>

        {!full ? (
          <>
            <div className="mt-6 border border-dashed border-ink/25 bg-paper-bright p-5 text-center">
              <p className="label text-ink-mute">Your reference</p>
              <p className="font-display mt-1 text-3xl tracking-wider tabular">
                {ref}
              </p>
              {/* Stand-in for the QR ticket the live system will issue. */}
              <div
                aria-hidden
                className="halftone mx-auto mt-4 h-20 w-20 opacity-60"
              />
              <p className="mt-3 text-[0.8rem] text-ink-mute">
                Show this at the door. A QR ticket is emailed once the live
                system is connected.
              </p>
            </div>
            <p className="mt-5 text-[0.9rem] leading-relaxed text-ink-soft">
              Registered for {party} {party === 1 ? "person" : "people"}
              {priceCents > 0
                ? `. ${fmtPeso(priceCents * party)} payable on arrival.`
                : "."}
            </p>
          </>
        ) : (
          <p className="mt-3 leading-relaxed text-ink-soft">
            Places open up regularly as plans change. You are not charged
            anything unless a place opens and you confirm it.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/events"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            More events
          </Link>
          <Link
            href="/events/calendar"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            See the calendar
          </Link>
        </div>
      </FormSuccess>
    );
  }

  return (
    <div className="border border-hairline bg-paper-bright p-7">
      {full ? (
        <>
          <Pill tone="clay">Full</Pill>
          <h2 className="font-display mt-4 text-2xl leading-tight">
            Join the waitlist
          </h2>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
            Places open up regularly. We email in order, and nothing is
            confirmed until you accept.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl leading-tight">Register</h2>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
            {priceCents > 0
              ? `${fmtPeso(priceCents)} per person, payable on arrival.`
              : "Free. We just need a rough headcount."}
          </p>
        </>
      )}

      <form
        ref={formRef}
        className="mt-6 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!validate()) return;
          setDone(true);
        }}
      >
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

        <Field label="Email" name="email" required error={errors.email}>
          {(p) => (
            <input
              {...p}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={controlClass}
            />
          )}
        </Field>

        <Field
          label="Mobile"
          name="mobile"
          hint="Optional, for last-minute changes"
        >
          {(p) => (
            <input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className={controlClass}
            />
          )}
        </Field>

        {!full ? (
          <div className="flex items-center justify-between border border-hairline px-4 py-3">
            <span className="label text-ink-mute">How many coming?</span>
            <span className="flex items-center gap-4">
              <button
                type="button"
                aria-label="One fewer"
                onClick={() => setParty((n) => Math.max(1, n - 1))}
                className="btn-press flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
              >
                −
              </button>
              <span
                className="font-display w-5 text-center text-xl tabular"
                aria-live="polite"
              >
                {party}
              </span>
              <button
                type="button"
                aria-label="One more"
                onClick={() => setParty((n) => Math.min(10, n + 1))}
                className="btn-press flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
              >
                +
              </button>
            </span>
          </div>
        ) : null}

        {priceCents > 0 && !full ? (
          <div className="flex items-baseline justify-between border-t border-hairline pt-4">
            <span className="label text-ink-mute">Total on arrival</span>
            <span className="font-display text-2xl tabular">
              {fmtPeso(priceCents * party)}
            </span>
          </div>
        ) : null}

        <Button type="submit" size="lg" full>
          {full ? "Join the waitlist" : "Confirm registration"}
        </Button>

        <p className="text-[0.8rem] leading-relaxed text-ink-mute">
          Your details are used for this event only. They are not published or
          shared outside the CCF Centris team.
        </p>
      </form>
    </div>
  );
}
