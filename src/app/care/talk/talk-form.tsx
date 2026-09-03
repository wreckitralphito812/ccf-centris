"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";

/**
 * Pastoral request. Routes by kind to the right team, and the copy is honest
 * about what happens next rather than promising an instant response nobody
 * can guarantee.
 */

const KINDS = [
  {
    id: "know_jesus",
    title: "I want to know Jesus",
    body: "You have questions about faith, or you have decided something and want to talk it through.",
  },
  {
    id: "prayer",
    title: "I need prayer",
    body: "Something specific you would like prayed for. This can also be sent anonymously.",
  },
  {
    id: "support",
    title: "I need pastoral support",
    body: "Grief, family trouble, work, doubt, or something you have not said out loud yet.",
  },
  {
    id: "contact",
    title: "I want someone to contact me",
    body: "You would rather talk than write. Tell us how to reach you.",
  },
  {
    id: "counselling",
    title: "I need counselling information",
    body: "You are looking for professional help and want to know where to start.",
  },
];

export function TalkForm() {
  const [sent, setSent] = useState(false);
  const [kind, setKind] = useState<string>("");
  const [contactBy, setContactBy] = useState("email");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    body: "",
  });

  if (sent) {
    const chosen = KINDS.find((k) => k.id === kind);
    return (
      <div className="border border-clay bg-clay/8 p-8">
        <p className="label text-clay">Sent</p>
        <h2 className="display-md mt-3">Thank you for telling us.</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Someone from the CCF Centris pastoral team will get in touch by{" "}
          {contactBy === "email" ? "email" : "phone"}, usually within a couple of
          days.
        </p>
        {kind === "prayer" ? (
          <p className="mt-3 leading-relaxed text-ink-soft">
            In the meantime, the prayer team has your request.
          </p>
        ) : null}
        {chosen ? (
          <p className="mt-3 text-[0.88rem] text-ink-mute">
            Sent as: {chosen.title}
          </p>
        ) : null}
        <p className="mt-5 text-[0.88rem] leading-relaxed text-ink-mute">
          If things become urgent before then, please contact emergency services
          on 911 rather than waiting for a reply.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/know-jesus"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Read about knowing Jesus
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
          What brings you here? <span className="text-clay">*</span>
        </legend>
        <div className="mt-3 space-y-px border border-hairline bg-hairline">
          {KINDS.map((k) => (
            <label
              key={k.id}
              className={cx(
                "flex cursor-pointer items-start gap-4 bg-paper-bright p-5 transition-colors",
                kind === k.id ? "bg-bone" : "hover:bg-bone/50",
              )}
            >
              <input
                type="radio"
                name="kind"
                required
                checked={kind === k.id}
                onChange={() => setKind(k.id)}
                className="mt-1 h-4 w-4 accent-[var(--clay)]"
              />
              <span>
                <span className="font-display block text-lg leading-tight">
                  {k.title}
                </span>
                <span className="mt-1 block text-[0.88rem] leading-relaxed text-ink-soft">
                  {k.body}
                </span>
              </span>
            </label>
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

      <fieldset>
        <legend className="label text-ink-mute">
          How should we reach you?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["email", "Email"],
            ["phone", "Phone"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={contactBy === v}
              onClick={() => setContactBy(v)}
              className={cx(
                "label border px-3.5 py-2 transition-colors",
                contactBy === v
                  ? "border-clay bg-clay text-paper-bright"
                  : "border-ink/25 text-ink hover:border-ink",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" required={contactBy === "email"}>
          <input
            required={contactBy === "email"}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={input}
          />
        </Field>
        <Field label="Mobile" required={contactBy === "phone"}>
          <input
            required={contactBy === "phone"}
            type="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className={input}
          />
        </Field>
      </div>

      <Field
        label="Anything you'd like to say first"
        hint="Optional. As much or as little as you want."
      >
        <textarea
          rows={6}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className={input}
        />
      </Field>

      <p className="text-[0.82rem] leading-relaxed text-ink-mute">
        What you write reaches the CCF Centris pastoral team only. It is not
        published, not shared with other members, and not added to any mailing
        list.
      </p>

      <Button type="submit" size="lg" full>
        Send
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
