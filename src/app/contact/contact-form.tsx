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

const TOPICS = [
  "Visiting for the first time",
  "Joining a Dgroup",
  "Events and registration",
  "Booking a court or room",
  "Volunteering",
  "GLC classes",
  "NXTGEN and children",
  "Something else",
];

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
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
    if (!form.message.trim()) next.message = "Add a short message.";
    setErrors(next);
    return focusFirstInvalid(next, formRef.current);
  }

  if (sent) {
    return (
      <FormSuccess className="p-8">
        <p className="label text-clay">Sent</p>
        <h2 className="display-md mt-3">Thanks, we&rsquo;ll be in touch.</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Someone from the CCF Centris team reads every message and usually
          replies within a couple of working days.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/visit/faqs"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Read the FAQs
          </Link>
          <Link
            href="/"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Back to home
          </Link>
        </div>
      </FormSuccess>
    );
  }

  return (
    <form
      ref={formRef}
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!validate()) return;
        setSent(true);
      }}
    >
      <fieldset>
        <legend className="label text-ink-mute">
          What&rsquo;s this about?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(topic === t ? "" : t)}
              className={cx(
                "btn-press label border px-3.5 py-2 transition-colors",
                topic === t
                  ? "border-clay bg-clay text-paper-bright"
                  : "border-ink/25 text-ink hover:border-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

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

      <Field label="Your message" name="message" required error={errors.message}>
        {(p) => (
          <textarea
            {...p}
            rows={7}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={controlClass}
          />
        )}
      </Field>

      <p className="text-[0.82rem] leading-relaxed text-ink-mute">
        Your details are used to reply to you and nothing else. They are not
        added to a mailing list without you asking.
      </p>

      <Button type="submit" size="lg" full>
        Send message
      </Button>
    </form>
  );
}
