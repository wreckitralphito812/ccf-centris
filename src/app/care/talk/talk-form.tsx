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

type Errors = Partial<Record<"kind" | "name" | "email" | "mobile", string>>;

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
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function validate(): boolean {
    const next: Errors = {};
    if (!kind) next.kind = "Pick the one that fits best.";
    if (!form.name.trim()) next.name = "Tell us your name.";
    if (contactBy === "email") {
      if (!form.email.trim()) next.email = "We need an email to reach you.";
      else if (!/.+@.+\..+/.test(form.email))
        next.email = "That does not look like an email address.";
    }
    if (contactBy === "phone" && !form.mobile.trim())
      next.mobile = "We need a number to call you on.";
    setErrors(next);
    return focusFirstInvalid(next, formRef.current);
  }

  if (sent) {
    const chosen = KINDS.find((k) => k.id === kind);
    return (
      <FormSuccess className="p-8">
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
          What brings you here? <span className="text-clay">*</span>
        </legend>
        {errors.kind ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.8rem] font-semibold text-clay-deep">
            <span aria-hidden>!</span>
            {errors.kind}
          </p>
        ) : null}
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
                checked={kind === k.id}
                onChange={() => setKind(k.id)}
                className="mt-1 h-4 w-4 accent-clay"
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
                "btn-press label border px-3.5 py-2 transition-colors",
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
        <Field
          label="Email"
          name="email"
          required={contactBy === "email"}
          error={errors.email}
        >
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
          required={contactBy === "phone"}
          error={errors.mobile}
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
      </div>

      <Field
        label="Anything you'd like to say first"
        name="body"
        hint="Optional. As much or as little as you want."
      >
        {(p) => (
          <textarea
            {...p}
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={controlClass}
          />
        )}
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
