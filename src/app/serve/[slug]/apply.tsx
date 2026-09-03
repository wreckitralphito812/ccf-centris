"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";
import {
  Field,
  FormSuccess,
  controlClass,
  focusFirstInvalid,
} from "@/components/form";

/**
 * Volunteer application. Goes to the volunteer team for that ministry, and
 * for child-facing or pastoral roles it opens a screening process rather than
 * placing someone on a rota. The copy says so, because a volunteer who is
 * surprised by a background check is a volunteer who drops out.
 */

type Errors = Partial<Record<"name" | "email", string>>;

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
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function validate(): boolean {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Tell us your name.";
    if (!form.email.trim()) next.email = "We need an email to reply to.";
    else if (!/.+@.+\..+/.test(form.email))
      next.email = "That does not look like an email address.";
    setErrors(next);
    return focusFirstInvalid(next, formRef.current);
  }

  if (sent) {
    return (
      <FormSuccess>
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
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Other roles
          </Link>
          <Link
            href="/serve/at-centris"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Teams at Centris
          </Link>
        </div>
      </FormSuccess>
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
        ref={formRef}
        className="mt-6 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!validate()) return;
          setSent(true);
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

        <Field label="Mobile" name="mobile" hint="Optional">
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

        <Field label="When are you usually free?" name="availability">
          {(p) => (
            <select
              {...p}
              value={form.availability}
              onChange={(e) =>
                setForm({ ...form, availability: e.target.value })
              }
              className={cx(controlClass, "py-2.5")}
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
          )}
        </Field>

        <Field label="Anything we should know?" name="message" hint="Optional">
          {(p) => (
            <textarea
              {...p}
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={controlClass}
              placeholder="Experience, questions, or constraints on your time."
            />
          )}
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
