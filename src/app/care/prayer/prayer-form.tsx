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
 * Prayer request.
 *
 * The most sensitive form on the site. Requests are never published, never
 * read aloud without permission, and reach only the prayer and pastoral teams.
 * Anonymity is the default-adjacent option rather than buried, because the
 * people who most need to ask are often the least willing to be named.
 */

const CATEGORIES = [
  "Personal",
  "Family",
  "Health",
  "Work",
  "Relationships",
  "Spiritual",
  "Other",
];

type Errors = Partial<Record<"body", string>>;

export function PrayerForm() {
  const [sent, setSent] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [category, setCategory] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    body: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function validate(): boolean {
    const next: Errors = {};
    if (!form.body.trim())
      next.body = "Add a few words about what to pray for.";
    setErrors(next);
    return focusFirstInvalid(next, formRef.current);
  }

  if (sent) {
    return (
      <FormSuccess className="p-8">
        <p className="label text-clay">Received</p>
        <h2 className="display-md mt-3">Someone is praying for this.</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Your request has gone to the CCF Centris prayer team. It is not
          published anywhere, and only the prayer and pastoral teams can see it.
        </p>
        {followUp && !anonymous ? (
          <p className="mt-3 leading-relaxed text-ink-soft">
            You asked to be contacted, so someone will reach out in the next few
            days.
          </p>
        ) : (
          <p className="mt-3 leading-relaxed text-ink-soft">
            You did not ask to be contacted, so nobody will get in touch. The
            request is simply prayed for.
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/care/talk"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            I&rsquo;d like to talk to someone
          </Link>
          <Link
            href="/"
            className="label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
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
      {/* Anonymity first, because it changes everything below it. */}
      <fieldset className="border border-hairline bg-paper-bright p-5">
        <legend className="label px-2 text-ink-mute">How to send this</legend>
        <div className="mt-2 space-y-3">
          {[
            {
              value: false,
              title: "Include my name",
              body: "The prayer team knows who is asking and can follow up if you want them to.",
            },
            {
              value: true,
              title: "Send anonymously",
              body: "No name, no contact details. The request is prayed for and nobody can trace it back to you.",
            },
          ].map((opt) => (
            <label
              key={String(opt.value)}
              className={cx(
                "flex cursor-pointer items-start gap-3 border p-4 transition-colors",
                anonymous === opt.value
                  ? "border-clay bg-clay/8"
                  : "border-hairline hover:border-ink/40",
              )}
            >
              <input
                type="radio"
                name="anonymity"
                checked={anonymous === opt.value}
                onChange={() => {
                  setAnonymous(opt.value);
                  if (opt.value) setFollowUp(false);
                }}
                className="mt-1 h-4 w-4 accent-clay"
              />
              <span>
                <span className="block font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-[0.85rem] leading-relaxed text-ink-soft">
                  {opt.body}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!anonymous ? (
        <div className="space-y-5">
          <Field label="Your name" name="name">
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
            <Field label="Email" name="email" hint="Only if you want a reply">
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
        </div>
      ) : null}

      <fieldset>
        <legend className="label text-ink-mute">
          What is this about? (optional)
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={cx(
                "btn-press label border px-3.5 py-2 transition-colors",
                category === c
                  ? "border-clay bg-clay text-paper-bright"
                  : "border-ink/25 text-ink hover:border-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <Field
        label="What would you like us to pray for?"
        name="body"
        required
        error={errors.body}
      >
        {(p) => (
          <textarea
            {...p}
            rows={7}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={controlClass}
            placeholder="As much or as little as you want to say."
          />
        )}
      </Field>

      {!anonymous ? (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={followUp}
            onChange={(e) => setFollowUp(e.target.checked)}
            className="mt-1 h-4 w-4 accent-clay"
          />
          <span className="text-[0.92rem] leading-relaxed text-ink-soft">
            I would like someone from the pastoral team to contact me about this.
          </span>
        </label>
      ) : null}

      <div className="border-l-2 border-clay bg-paper-bright py-4 pl-5 pr-4">
        <p className="label text-clay">How this is handled</p>
        <ul className="mt-2 space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft">
          <li>Your request is never published anywhere on this site.</li>
          <li>Only the prayer and pastoral teams can read it.</li>
          <li>It is never read aloud in a service or a group without asking you first.</li>
          <li>Nobody contacts you unless you ask them to.</li>
        </ul>
      </div>

      <Button type="submit" size="lg" full>
        Send my request
      </Button>
    </form>
  );
}
