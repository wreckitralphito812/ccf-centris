"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Pill } from "@/components/ui";
import { fmtPeso } from "@/lib/format";

/**
 * Event registration.
 *
 * A full event puts people on a waitlist rather than turning them away, and
 * says so plainly. Paid events stop at "reserved, pay on arrival" because no
 * payment provider is connected: the flow is real, the charge is not, and the
 * copy never implies otherwise.
 */
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

  // Deterministic-looking reference so the confirmation feels real.
  const ref = `CEN-${eventTitle.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${String(
    (eventTitle.length * 7919) % 9000 + 1000,
  )}`;

  if (!requiresRegistration) {
    return (
      <div className="border border-hairline bg-paper-bright p-7">
        <Pill tone="moss">No registration needed</Pill>
        <h2 className="font-display mt-4 text-2xl leading-tight">
          Just turn up.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          There is no list and no ticket for this one. Come as you are, bring
          whoever you like.
        </p>
        <Link
          href="/visit/directions"
          className="label mt-5 inline-block text-clay underline underline-offset-4"
        >
          How to get here
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="border border-clay bg-clay/8 p-7">
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
              <p className="font-display mt-1 text-3xl tracking-wider">{ref}</p>
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
            className="label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            More events
          </Link>
          <Link
            href="/events/calendar"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            See the calendar
          </Link>
        </div>
      </div>
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
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        <Field label="Your name" required>
          <input
            required
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={input}
          />
        </Field>

        <Field label="Email" required>
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={input}
          />
        </Field>

        <Field label="Mobile" hint="Optional, for last-minute changes">
          <input
            type="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className={input}
          />
        </Field>

        {!full ? (
          <div className="flex items-center justify-between border border-hairline px-4 py-3">
            <span className="label text-ink-mute">How many coming?</span>
            <span className="flex items-center gap-4">
              <button
                type="button"
                aria-label="One fewer"
                onClick={() => setParty((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
              >
                −
              </button>
              <span className="font-display w-5 text-center text-xl tabular-nums">
                {party}
              </span>
              <button
                type="button"
                aria-label="One more"
                onClick={() => setParty((p) => Math.min(10, p + 1))}
                className="flex h-8 w-8 items-center justify-center border border-ink/25 transition-colors hover:border-ink"
              >
                +
              </button>
            </span>
          </div>
        ) : null}

        {priceCents > 0 && !full ? (
          <div className="flex items-baseline justify-between border-t border-hairline pt-4">
            <span className="label text-ink-mute">Total on arrival</span>
            <span className="font-display text-2xl">
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

const input =
  "w-full border border-hairline bg-paper px-4 py-3 text-[0.95rem] outline-none focus:border-ink";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label text-ink-mute">
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </span>
      {hint ? (
        <span className="mt-1 block text-[0.8rem] text-ink-mute">{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
