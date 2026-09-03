"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Volunteer application. Goes to the volunteer team for that ministry, and
 * for child-facing or pastoral roles it opens a screening process rather than
 * placing someone on a rota. The copy says so, because a volunteer who is
 * surprised by a background check is a volunteer who drops out.
 */
export function ApplyForm({
  roleTitle,
  screened,
}: {
  roleTitle: string;
  screened: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    availability: "",
    message: "",
  });

  if (sent) {
    return (
      <div className="border border-clay bg-clay/8 p-7">
        <p className="label text-clay">Application sent</p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          Someone will be in touch.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          The team lead for {roleTitle} reads these and usually replies within a
          week. It is a conversation about whether the role suits you, not an
          interview.
        </p>
        {screened ? (
          <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-mute">
            This role involves children or pastoral confidence, so the next step
            includes a background check and training before a first shift.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/serve"
            className="label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Other roles
          </Link>
          <Link
            href="/serve/at-centris"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Teams at Centris
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-paper-bright p-7">
      <h2 className="font-display text-2xl leading-tight">
        Apply for this role
      </h2>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
        No experience needed unless the role says otherwise.
      </p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
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

        <Field label="Mobile" hint="Optional">
          <input
            type="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className={input}
          />
        </Field>

        <Field label="When are you usually free?">
          <select
            value={form.availability}
            onChange={(e) => setForm({ ...form, availability: e.target.value })}
            className={input}
          >
            <option value="">Choose one</option>
            {[
              "Saturday evening service",
              "Sunday early service",
              "Sunday later service",
              "Weekday evenings",
              "Weekends, flexible",
              "Occasional events only",
            ].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Anything we should know?" hint="Optional">
          <textarea
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={input}
            placeholder="Experience, questions, or constraints on your time."
          />
        </Field>

        {screened ? (
          <p className="border-l-2 border-clay pl-4 text-[0.85rem] leading-relaxed text-ink-soft">
            This role involves children or pastoral confidence. A background
            check and training are required before your first shift, without
            exception.
          </p>
        ) : null}

        <Button type="submit" size="lg" full>
          Send application
        </Button>

        <p className="text-[0.8rem] leading-relaxed text-ink-mute">
          Your details go to the CCF Centris volunteer team only.
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
