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
 * Dgroup interest. Goes to the Dgroup team, never straight to the leader,
 * and never publishes the enquirer's details anywhere public.
 */

type Errors = Partial<Record<"name" | "email", string>>;

export function InterestForm({ dgroupName }: { dgroupName: string }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    age: "",
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
        <p className="label text-clay">Sent</p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          Thanks. Someone will be in touch.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A member of the Dgroup team reads every note and usually replies
          within a few days. They will introduce you to {dgroupName} and answer
          anything before you go along.
        </p>
        <p className="mt-4 text-[0.88rem] text-ink-mute">
          You are never added to a group without a conversation first.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/grow/find-a-dgroup"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Browse other groups
          </Link>
          <Link
            href="/visit/service-times"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Sunday service times
          </Link>
        </div>
      </FormSuccess>
    );
  }

  return (
    <form
      ref={formRef}
      className="space-y-5"
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

      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>

      <Field
        label="Age bracket"
        name="age"
        hint="Optional, helps us place you well"
      >
        {(p) => (
          <select
            {...p}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className={cx(controlClass, "py-2.5")}
          >
            <option value="">Prefer not to say</option>
            {["Under 18", "18–24", "25–34", "35–44", "45–59", "60+"].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        label="Anything you'd like them to know"
        name="message"
        hint="Optional"
      >
        {(p) => (
          <textarea
            {...p}
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={controlClass}
            placeholder="New to CCF, work shifts, coming with my spouse, anything at all."
          />
        )}
      </Field>

      <p className="text-[0.82rem] leading-relaxed text-ink-mute">
        Your details go to the CCF Centris Dgroup team only. They are not
        published, not shared with other members, and not used for anything
        else.
      </p>

      <Button type="submit" size="lg" full>
        Send my interest
      </Button>
    </form>
  );
}
