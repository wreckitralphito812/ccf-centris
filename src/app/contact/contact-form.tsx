"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";

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

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    message: "",
  });

  if (sent) {
    return (
      <div className="border border-clay bg-clay/8 p-8">
        <p className="label text-clay">Sent</p>
        <h2 className="display-md mt-3">Thanks, we&rsquo;ll be in touch.</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Someone from the CCF Centris team reads every message and usually
          replies within a couple of working days.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/visit/faqs"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Read the FAQs
          </Link>
          <Link
            href="/"
            className="label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
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
                "label border px-3.5 py-2 transition-colors",
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

      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>

      <Field label="Your message" required>
        <textarea
          required
          rows={7}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={input}
        />
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

const input =
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] outline-none focus:border-ink";

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
